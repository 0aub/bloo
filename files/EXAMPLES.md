# Bloo Examples

Realistic examples showing complete tool call sequences and resulting board data.

---

## Example 1: Documenting a SaaS API Project

A Node.js/Express API with PostgreSQL, Redis, JWT auth, deployed on AWS ECS.

### Tool Call Sequence

```
// Step 1: Create the board
create_board({
  name: "TaskFlow API",
  project_path: "/home/user/projects/taskflow-api",
  description: "Task management SaaS backend API"
})
→ { board_id: "board_tf001" }

// Step 2: Project Meta
add_section({
  board_id: "board_tf001",
  title: "Project Overview",
  category: "project_meta",
  reason: "Initial documentation"
})
→ { section_id: "sec_meta01" }

add_element({
  board_id: "board_tf001",
  section_id: "sec_meta01",
  type: "tech_stack",
  name: "Tech Stack",
  data: {
    categories: [
      {
        name: "Backend",
        technologies: [
          { name: "Node.js", version: "20.x", purpose: "Runtime" },
          { name: "Express", version: "4.18", purpose: "HTTP framework" },
          { name: "TypeScript", version: "5.3", purpose: "Language" },
          { name: "Prisma", version: "5.x", purpose: "ORM" }
        ]
      },
      {
        name: "Database",
        technologies: [
          { name: "PostgreSQL", version: "15", purpose: "Primary database" },
          { name: "Redis", version: "7", purpose: "Caching & sessions" }
        ]
      },
      {
        name: "Infrastructure",
        technologies: [
          { name: "AWS ECS", purpose: "Container orchestration" },
          { name: "Docker", purpose: "Containerization" },
          { name: "GitHub Actions", purpose: "CI/CD" },
          { name: "CloudWatch", purpose: "Monitoring" }
        ]
      }
    ]
  },
  reason: "Initial documentation"
})
→ { element_id: "el_stack01" }

// Step 3: System Architecture
add_section({
  board_id: "board_tf001",
  title: "System Architecture",
  category: "system_structure",
  reason: "Initial documentation"
})
→ { section_id: "sec_arch01" }

add_element({
  board_id: "board_tf001",
  section_id: "sec_arch01",
  type: "architecture_diagram",
  name: "System Overview",
  data: {
    components: [
      { id: "client", name: "Web Client", type: "client", technology: "React" },
      { id: "gateway", name: "API Gateway", type: "gateway", technology: "Nginx" },
      { id: "api", name: "TaskFlow API", type: "service", technology: "Express", layer: "backend" },
      { id: "worker", name: "Background Worker", type: "worker", technology: "Bull", layer: "backend" },
      { id: "db", name: "PostgreSQL", type: "database", technology: "PostgreSQL 15", layer: "data" },
      { id: "cache", name: "Redis", type: "cache", technology: "Redis 7", layer: "data" },
      { id: "queue", name: "Job Queue", type: "queue", technology: "Bull/Redis", layer: "data" },
      { id: "s3", name: "File Storage", type: "storage", technology: "AWS S3", layer: "infrastructure" },
      { id: "email", name: "Email Service", type: "external", technology: "SendGrid" }
    ],
    connections: [
      { from: "client", to: "gateway", label: "HTTPS", protocol: "HTTPS", data_format: "JSON" },
      { from: "gateway", to: "api", label: "Proxy", protocol: "HTTP" },
      { from: "api", to: "db", label: "Queries", protocol: "TCP", data_format: "SQL" },
      { from: "api", to: "cache", label: "Sessions & Cache", protocol: "TCP" },
      { from: "api", to: "queue", label: "Enqueue Jobs", async: true },
      { from: "worker", to: "queue", label: "Process Jobs", async: true },
      { from: "worker", to: "db", label: "Read/Write", protocol: "TCP" },
      { from: "worker", to: "email", label: "Send Emails", protocol: "HTTPS", async: true },
      { from: "api", to: "s3", label: "File Upload", protocol: "HTTPS" }
    ],
    layers: [
      { name: "Client", component_ids: ["client"] },
      { name: "Edge", component_ids: ["gateway"] },
      { name: "Application", component_ids: ["api", "worker"] },
      { name: "Data", component_ids: ["db", "cache", "queue"] },
      { name: "External", component_ids: ["s3", "email"] }
    ]
  },
  reason: "Initial documentation"
})
→ { element_id: "el_arch01" }

// Step 4: Database Schema
add_section({
  board_id: "board_tf001",
  title: "Database Schema",
  category: "data_layer",
  reason: "Initial documentation"
})
→ { section_id: "sec_data01" }

bulk_add_elements({
  board_id: "board_tf001",
  section_id: "sec_data01",
  elements: [
    {
      type: "db_schema",
      name: "Core Tables",
      data: {
        tables: [
          {
            id: "users", name: "users",
            columns: [
              { name: "id", type: "uuid", primary_key: true },
              { name: "email", type: "varchar(255)", unique: true },
              { name: "name", type: "varchar(100)" },
              { name: "password_hash", type: "varchar(255)" },
              { name: "role", type: "enum(admin,member,viewer)" },
              { name: "org_id", type: "uuid" },
              { name: "created_at", type: "timestamp" }
            ]
          },
          {
            id: "organizations", name: "organizations",
            columns: [
              { name: "id", type: "uuid", primary_key: true },
              { name: "name", type: "varchar(255)" },
              { name: "plan", type: "enum(free,pro,enterprise)" },
              { name: "created_at", type: "timestamp" }
            ]
          },
          {
            id: "tasks", name: "tasks",
            columns: [
              { name: "id", type: "uuid", primary_key: true },
              { name: "title", type: "varchar(500)" },
              { name: "description", type: "text", nullable: true },
              { name: "status", type: "enum(todo,in_progress,done)" },
              { name: "priority", type: "enum(low,medium,high)" },
              { name: "assignee_id", type: "uuid", nullable: true },
              { name: "project_id", type: "uuid" },
              { name: "created_at", type: "timestamp" },
              { name: "due_date", type: "timestamp", nullable: true }
            ]
          },
          {
            id: "projects", name: "projects",
            columns: [
              { name: "id", type: "uuid", primary_key: true },
              { name: "name", type: "varchar(255)" },
              { name: "org_id", type: "uuid" },
              { name: "created_at", type: "timestamp" }
            ]
          }
        ],
        relationships: [
          { from_table: "users", from_column: "org_id", to_table: "organizations", to_column: "id", type: "many_to_one" },
          { from_table: "tasks", from_column: "assignee_id", to_table: "users", to_column: "id", type: "many_to_one" },
          { from_table: "tasks", from_column: "project_id", to_table: "projects", to_column: "id", type: "many_to_one" },
          { from_table: "projects", from_column: "org_id", to_table: "organizations", to_column: "id", type: "many_to_one" }
        ]
      }
    },
    {
      type: "note",
      name: "Cache Strategy",
      data: {
        content: "Redis caches: user sessions (TTL 24h), task counts per project (TTL 5min), org plan details (TTL 1h). Cache invalidation on write via Prisma middleware.",
        color: "blue"
      }
    }
  ],
  reason: "Initial documentation — 4 core tables + cache strategy"
})
→ { element_ids: ["el_db01", "el_cache_note01"] }

// Step 5: Security
add_section({
  board_id: "board_tf001",
  title: "Security",
  category: "security",
  reason: "Initial documentation"
})
→ { section_id: "sec_sec01" }

add_element({
  board_id: "board_tf001",
  section_id: "sec_sec01",
  type: "security_layer_map",
  name: "Security Layers",
  data: {
    layers: [
      { id: "cdn", name: "CloudFront CDN", level: 0, technology: "AWS CloudFront", description: "DDoS protection, edge caching" },
      { id: "waf", name: "WAF", level: 1, technology: "AWS WAF", description: "SQL injection, XSS prevention" },
      { id: "rate", name: "Rate Limiting", level: 2, technology: "express-rate-limit", description: "100 req/min per IP" },
      { id: "cors", name: "CORS", level: 3, technology: "cors middleware", description: "Restrict to app domains" },
      { id: "auth", name: "JWT Auth", level: 4, technology: "jsonwebtoken", description: "Bearer token validation" },
      { id: "rbac", name: "RBAC", level: 5, technology: "Custom middleware", description: "Role-based route protection" },
      { id: "encrypt", name: "Encryption", level: 6, technology: "bcrypt + AES-256", description: "Passwords hashed, sensitive data encrypted at rest" }
    ],
    flows: [
      { name: "API Request", path: ["cdn", "waf", "rate", "cors", "auth", "rbac", "encrypt"] }
    ]
  },
  reason: "Initial documentation"
})
→ { element_id: "el_sec01" }

// Step 6: Cross-references
add_cross_reference({
  board_id: "board_tf001",
  from_element_id: "el_arch01",
  to_element_id: "el_db01",
  relationship: "reads_from",
  description: "API service reads/writes to all core tables"
})

add_cross_reference({
  board_id: "board_tf001",
  from_element_id: "el_sec01",
  to_element_id: "el_arch01",
  relationship: "secured_by",
  description: "All API routes pass through security layers"
})

// Step 7: Decision
add_decision({
  board_id: "board_tf001",
  title: "Chose PostgreSQL over MongoDB",
  context: "Needed a database for task management with complex relationships (users, orgs, projects, tasks). Requires ACID transactions for org billing operations.",
  decision: "PostgreSQL with Prisma ORM. Schema-first with version-controlled migrations.",
  alternatives: ["MongoDB — flexible but poor fit for relational data", "MySQL — viable but PostgreSQL better for JSON columns and advanced queries"],
  consequences: "Must manage migrations. Prisma adds build step. Strong ecosystem support.",
  related_elements: ["el_db01", "el_arch01"],
  status: "accepted"
})

// Step 8: Finalize
add_milestone({
  board_id: "board_tf001",
  name: "initial-documentation",
  description: "First comprehensive documentation of TaskFlow API"
})

export_board({
  board_id: "board_tf001",
  format: "html",
  output_path: "/home/user/projects/taskflow-api/docs/board.html"
})
```

---

## Example 2: Incremental Update

Two months later, a payment system has been added.

```
// Check current state
get_board({ board_id: "board_tf001" })
board_health_report({ board_id: "board_tf001" })
→ { stale_elements: [{ element_id: "el_db01", days_since_update: 60 }] }

// Add new tables to DB schema
update_element({
  board_id: "board_tf001",
  element_id: "el_db01",
  data: {
    tables: [
      // ... existing tables plus:
      {
        id: "subscriptions", name: "subscriptions",
        columns: [
          { name: "id", type: "uuid", primary_key: true },
          { name: "org_id", type: "uuid" },
          { name: "stripe_subscription_id", type: "varchar(255)" },
          { name: "plan", type: "enum(free,pro,enterprise)" },
          { name: "status", type: "enum(active,canceled,past_due)" },
          { name: "current_period_end", type: "timestamp" }
        ]
      },
      {
        id: "invoices", name: "invoices",
        columns: [
          { name: "id", type: "uuid", primary_key: true },
          { name: "org_id", type: "uuid" },
          { name: "amount_cents", type: "integer" },
          { name: "status", type: "enum(draft,open,paid,void)" },
          { name: "stripe_invoice_id", type: "varchar(255)" },
          { name: "created_at", type: "timestamp" }
        ]
      }
    ],
    relationships: [
      // ... existing plus:
      { from_table: "subscriptions", from_column: "org_id", to_table: "organizations", to_column: "id", type: "one_to_one" },
      { from_table: "invoices", from_column: "org_id", to_table: "organizations", to_column: "id", type: "one_to_many" }
    ]
  },
  reason: "Added payment system — subscriptions and invoices tables for Stripe integration"
})

// Update architecture diagram with Stripe
update_element({
  board_id: "board_tf001",
  element_id: "el_arch01",
  data: {
    components: [
      // ... existing plus:
      { id: "stripe", name: "Stripe", type: "external", technology: "Stripe API" }
    ],
    connections: [
      // ... existing plus:
      { from: "api", to: "stripe", label: "Payment Processing", protocol: "HTTPS", data_format: "JSON" },
      { from: "stripe", to: "api", label: "Webhooks", protocol: "HTTPS", async: true }
    ]
  },
  reason: "Added Stripe integration for payment processing"
})

// Add payment flow diagram
add_element({
  board_id: "board_tf001",
  section_id: "sec_arch01",
  type: "sequence_diagram",
  name: "Payment Flow",
  data: {
    actors: [
      { id: "user", name: "User", type: "user" },
      { id: "api", name: "TaskFlow API", type: "service" },
      { id: "stripe", name: "Stripe", type: "external" },
      { id: "db", name: "PostgreSQL", type: "database" }
    ],
    messages: [
      { from: "user", to: "api", label: "POST /subscribe", type: "sync", order: 1 },
      { from: "api", to: "stripe", label: "Create Subscription", type: "sync", order: 2 },
      { from: "stripe", to: "api", label: "Subscription Created", type: "response", order: 3 },
      { from: "api", to: "db", label: "Save subscription record", type: "sync", order: 4 },
      { from: "api", to: "user", label: "200 OK", type: "response", order: 5 },
      { from: "stripe", to: "api", label: "Webhook: invoice.paid", type: "async", order: 6, note: "Async — may arrive minutes later" },
      { from: "api", to: "db", label: "Update invoice status", type: "sync", order: 7 }
    ]
  },
  reason: "Documenting the payment subscription flow with Stripe webhooks"
})

// Log the decision
add_decision({
  board_id: "board_tf001",
  title: "Chose Stripe for payment processing",
  context: "Need subscription billing for Pro and Enterprise plans. Must support multiple currencies, tax calculation, and invoice generation.",
  decision: "Stripe Billing with webhook-based event processing. Subscription lifecycle managed by Stripe, synced to our DB via webhooks.",
  alternatives: ["Paddle — simpler but less control", "Custom billing — too much work for current team size"],
  consequences: "Dependent on Stripe uptime. Must handle webhook failures with retries. PCI compliance handled by Stripe.",
  related_elements: ["el_db01", "el_arch01"],
  status: "accepted"
})

// Milestone before export
add_milestone({
  board_id: "board_tf001",
  name: "payment-system-added",
  description: "Added Stripe payment system with subscriptions and invoicing"
})

export_board({
  board_id: "board_tf001",
  format: "html"
})
```

---

## Example 3: Querying History

```
// What changed since the initial documentation?
compare_snapshots({
  board_id: "board_tf001",
  from_version: "initial-documentation",
  to_version: "payment-system-added"
})
→ {
    added: [
      { type: "element", name: "Payment Flow", id: "el_seq01" }
    ],
    modified: [
      { element_id: "el_db01", name: "Core Tables", changes: [{ field: "data.tables.length", old_value: 4, new_value: 6 }] },
      { element_id: "el_arch01", name: "System Overview", changes: [{ field: "data.components.length", old_value: 9, new_value: 10 }] }
    ],
    stats: { total_changes: 5, decisions_made: 1, days_between: 60 }
  }

// Get the full timeline
get_timeline({
  board_id: "board_tf001",
  granularity: "month"
})

// Why did we choose Stripe?
get_decisions({
  board_id: "board_tf001",
  element_id: "el_arch01"
})
```
