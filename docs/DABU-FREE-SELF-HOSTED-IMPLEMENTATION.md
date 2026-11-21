# DABU Free Self-Hosted Architecture & Security Plan

Date: 2026-11-21
Target branch: `feature/multi-kdmp-license-control-center`
Status: source audit and implementation design; no production changes

## Decision

DABU will use a 100% no-paid-AI-API architecture:
- Run an open-weight model locally with Ollama on infrastructure controlled by Nusa Pixel.
- Do not call OpenAI, Gemini, OpenRouter, or any other external model provider.
- Do not use Ollama cloud models or model tags that route inference to a hosted provider.
- The model receives only the minimum context produced by trusted DAGBOEK backend functions.
- The AI is read-only. It cannot issue SQL, call arbitrary tools, or mutate ERP data.
- If the local AI service is unavailable, return a clear unavailable response. Never silently fail over to a paid or third-party AI provider.

This means zero AI-token/API charges, not a guarantee that all infrastructure, network, backup, domain, or operational costs are zero.

## Source audit: current implementation

Audited on the feature branch:
- `supabase/functions/dabu-assistant/index.ts`
- `app.js` DABU section (around lines 9359-9520)
- `supabase/migrations/202611210005_dabu_memory.sql`
- `supabase/config.toml`
- Multi-KDMP blueprint and existing tenant audit documents

### Current Edge Function behavior

1. Requires a bearer token and validates it with Supabase Auth `getUser(token)`.
2. Reads `profiles.role` and uses that operational role to determine which ERP context to load.
3. Loads up to 12 prior messages for a conversation.
4. Loads `dabu_user_memory` by authenticated user ID.
5. Reads inventory products and recent store sales; conditionally reads financial transactions, journal entries, and accounts based on profile role.
6. Sends the assembled prompt to `https://api.openai.com/v1/responses`, with model literal `gpt-6.2-astra`.
7. Stores user and assistant messages in Supabase.

### Findings and required changes

| Finding | Risk / impact | Required design |
|---|---|---|
| OpenAI API call and secret dependency | Not compatible with zero paid AI API | Replace provider call with private Ollama inference endpoint |
| Model literal is hard-coded | Model availability/compatibility is unverified | Configure an allowlisted local model name and pinned model digest/tag |
| No explicit active-tenant resolution in DABU function | Tenant context depends on broader RLS state and could be ambiguous for multi-membership users | Resolve active membership server-side; never trust tenant ID from prompt/body |
| Conversation tables are user-owned only | A user belonging to multiple KDMPs could carry history across tenant contexts | Add tenant ownership to conversations/messages and enforce both tenant and user checks |
| DABU queries rely on current policies | Existing schema is not yet fully tenantized; current policies are not a complete multi-tenant boundary | Do not enable multi-KDMP DABU until tenant RLS and trusted data adapter are complete |
| `profiles.role` drives AI context | Conflicts with equal module access and may leak/omit data based on descriptive job title | Use verified active membership + capability policy, not operational role as tenant authorization |
| Broad CORS origin `*` | Unnecessarily broad browser-origin surface | Restrict origins to deployed DAGBOEK origins; still require JWT and server authorization |
| Context is assembled from direct table reads | AI context is coupled to table structure and policy behavior | Introduce a narrow, typed, read-only data adapter with explicit tenant predicates and bounded outputs |
| Memory is included in every prompt | Memory may contain stale or sensitive context | Keep user-scoped memory, apply length limits and explicit user ownership; do not treat memory as authorization |
| Client localStorage stores conversation ID by user only | Does not distinguish active tenant | Namespace local conversation pointer by authenticated user and active tenant; server remains authoritative |
| AI output is trusted as prose | Model can hallucinate or follow prompt injection in retrieved text | Mark retrieved data as untrusted, use strict system policy, and present exact figures from backend outputs rather than model calculations |

## Target architecture

```text
DAGBOEK browser
    |
    | Supabase Auth JWT (during transition) / platform session (future)
    v
DABU Gateway (private API service controlled by Nusa Pixel)
    |
    +-- Authenticate identity
    +-- Resolve active cooperative membership server-side
    +-- Check cooperative license status
    +-- Apply per-user / per-tenant rate and concurrency limits
    +-- Load conversation scoped to user + tenant
    +-- Call allowlisted read-only data adapter
    |
    +--> DAGBOEK data adapter --> database (tenant-scoped, read-only)
    |
    +--> Ollama inference endpoint (private network only)
    |
    v
Validate bounded response --> persist conversation --> return answer
```

The Ollama HTTP API must not be exposed directly to the public internet. Bind it to localhost or a private network and allow requests only from the DABU Gateway. The gateway must be the only service permitted to call the model.

### Deployment topology

Preferred target is a private self-hosted Linux server under Nusa Pixel control. If OCI Always Free capacity is available, the initial pilot may use an Ampere A1 instance, but 2 OCPU / 12 GB RAM is a constrained environment. Model selection and concurrency must be benchmarked before promising responsiveness or uptime.

Do not provision infrastructure or incur any charge as part of this design-only phase. OCI account/server availability remains unverified.

## Tenant and data security contract

1. Authenticate the caller on every request.
2. Derive the user ID from the verified token/session, never from request JSON.
3. Resolve the active cooperative from a trusted membership record. If multiple active memberships exist, require an explicit active-tenant selection that is validated against membership on the server.
4. Check membership status and license status/expiry before reading cooperative data.
5. Derive `cooperative_id` on the server. Ignore or reject any client-supplied tenant identity.
6. Apply tenant predicates to every data adapter query, in addition to RLS as defense in depth.
7. Ensure all returned records are tenant-scoped and all parent-child relationships are tenant-consistent.
8. Apply user access/capability checks to the data adapter. Descriptive job title is not an authorization boundary.
9. Keep DABU read-only. No arbitrary SQL, database credentials, service-role key, mutation RPC, or unrestricted tool calling is available to the model.
10. Treat prompts, conversation history, memory, and database text as untrusted input. Retrieved content cannot override system policy.
11. Limit prompt size, context rows, output tokens, request rate, concurrent inference, and request timeout.
12. Avoid logging raw prompts, personal data, account numbers, member identities, or financial row contents.
13. If the model is unavailable, fail closed with a clear message. No external AI fallback.

## Conversation and memory data model

### Conversations and messages
- Add `cooperative_id` to `dabu_conversations`.
- Preserve `user_id` as the owner.
- Enforce a composite relationship so every message belongs to a conversation with the same user and tenant.
- Enforce tenant membership when reading, creating, or continuing a conversation.
- Add indexes for `(cooperative_id, user_id, last_message_at)` and `(conversation_id, created_at)`.
- Existing conversations must not be assigned to a tenant by guesswork. Backfill only after a verified ownership mapping; otherwise leave them in a controlled legacy state until resolved.
- Keep existing history intact. No conversation/message deletion or mutation as part of this architecture design.

### User memory
- Keep `dabu_user_memory` user-scoped as already designed.
- It is personalization context only, never a source of tenant identity, membership, authorization, or financial truth.
- Do not automatically merge memory between tenants.
- Before using memory in a tenant-specific prompt, clearly separate general user preferences from tenant data and avoid including tenant-sensitive memory unless ownership is explicit.

## Read-only data adapter

The model must not formulate SQL. The gateway calls fixed backend functions such as:
- `get_inventory_summary`
- `get_sales_summary`
- `get_financial_summary`
- `get_journal_status_summary`
- `get_account_reference`
- `get_erp_help_reference`

Each function:
- receives verified user/tenant context from the gateway, not model-generated arguments;
- checks active membership and license;
- uses tenant-scoped queries;
- returns only fields needed for the question;
- bounds date ranges and row counts;
- computes exact totals in SQL/application code;
- returns provenance (period, tenant, calculation timestamp) for factual figures.

The model may explain a returned figure but must not recalculate or invent it. For missing or ambiguous data, it must say so.

## Ollama/model operating policy

- Use only locally downloaded open-weight models.
- Pin model version/digest and record the license for the selected model.
- Evaluate Indonesian language quality, accounting explanations, prompt-injection resistance, and resource usage using synthetic data.
- Begin with one concurrent inference request; queue or reject excess work with a friendly response.
- Set strict input/output/context limits and request timeout.
- Do not automatically pull new model versions in production.
- Do not enable cloud inference, telemetry-dependent features that disclose prompts, or external provider fallback.
- Confirm model license permits the intended commercial SaaS use before selection.

## Rate limits and availability

Initial pilot defaults (tune after benchmark):
- one active inference per server;
- per-user and per-tenant request throttles;
- bounded queue with explicit busy response;
- short input limit and bounded output;
- server health check and model readiness check;
- no guarantee of 24/7 uptime on reclaimed/limited free infrastructure.

## Implementation sequence

1. Complete the current source audit and preserve findings in this document.
2. Decide active-tenant UX for users with more than one cooperative membership.
3. Define conversation ownership/backfill policy for existing history.
4. Build the DABU Gateway and fixed read-only data adapter in a separate service directory; no production secrets or deployment.
5. Build a local Ollama development setup with a small pinned model and synthetic data only.
6. Add tenant-scoped conversation schema migration only after the multi-tenant schema design and migration-history mismatch are resolved.
7. Add automated tests for tenant isolation, license enforcement, user ownership, prompt injection, rate limits, timeout, and read-only behavior.
8. Benchmark model latency/RAM/CPU on the actual free server before selecting production model and concurrency.
9. Run pilot against synthetic tenants, then a controlled Pendowo Asri pilot after explicit approval.
10. Disable the old OpenAI path only after the self-hosted replacement passes all acceptance tests.

## Required acceptance tests

- KDMP Alpha cannot read Beta inventory, sales, financial data, conversation, or message history.
- KDMP Beta cannot read Alpha data.
- A user with memberships in Alpha and Beta cannot carry a conversation into the wrong active tenant.
- A revoked membership or expired/suspended license cannot query tenant data.
- Client-supplied `cooperative_id` cannot override server-resolved tenant.
- A prompt asking for another KDMP's data is refused and produces no cross-tenant query.
- Prompt injection inside product names, transaction descriptions, memory, or prior messages cannot change authorization or trigger tools.
- No raw SQL or mutation tool is available to the model.
- DABU cannot create/update/delete/post/cancel any ERP record.
- Exact financial totals match backend/database calculations.
- Oversized requests, excess concurrency, timeout, and Ollama downtime fail safely.
- No external AI provider receives prompts or ERP context.
- Existing Pendowo Asri data and DABU history remain preserved.

## Safety gates

- This document is a design artifact only.
- No production database schema, data, RLS, Auth setting, Edge Function, or secrets were changed.
- No OpenAI key was added, removed, or used.
- No Ollama server or OCI resource was provisioned.
- No Supabase migration was created/applied for this DABU design.
- Do not merge or deploy until tenant migration, test environment, and explicit production approval are complete.
