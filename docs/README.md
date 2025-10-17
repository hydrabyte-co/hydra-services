# Hydra Services Documentation

Welcome to the Hydra Services documentation hub. This directory contains all technical documentation for the microservices architecture.

---

## 📚 Documentation Index

### 🚀 Getting Started

| Document | Description | Use When |
|----------|-------------|----------|
| [../CLAUDE.md](../CLAUDE.md) | Agent instructions & architecture overview | Understanding system architecture |
| [TEMPLATE-SERVICE-UPGRADE.md](TEMPLATE-SERVICE-UPGRADE.md) | Production-ready upgrade specification | Learning about production features |
| [TEMPLATE-SERVICE-UPGRADE_PLAN.md](TEMPLATE-SERVICE-UPGRADE_PLAN.md) | Implementation tracking & progress | Checking upgrade status |

### 🛠️ Creating New Services

| Document | Description | Use When |
|----------|-------------|----------|
| [**QUICK-PROMPT-NEW-SERVICE.md**](QUICK-PROMPT-NEW-SERVICE.md) | **Quick prompt templates** | **Creating simple services (START HERE)** |
| [PROMPT-NEW-SERVICE-CREATION.md](PROMPT-NEW-SERVICE-CREATION.md) | Detailed service creation guide | Creating complex services with special requirements |

### 📊 Testing & Results

| Document | Description | Use When |
|----------|-------------|----------|
| [TEST-RESULTS-PHASE2.md](TEST-RESULTS-PHASE2.md) | RBAC testing results | Understanding test patterns |

---

## 🎯 Quick Navigation

### I want to...

**Create a new microservice**
1. 📖 Read [QUICK-PROMPT-NEW-SERVICE.md](QUICK-PROMPT-NEW-SERVICE.md)
2. 📋 Copy the prompt template
3. ✏️ Fill in service details
4. 🤖 Paste to Claude Code Agent

**Understand the architecture**
1. 📖 Read [../CLAUDE.md](../CLAUDE.md) - Architecture section
2. 📂 Review Template Service: `services/template/`
3. 📖 Read [TEMPLATE-SERVICE-UPGRADE.md](TEMPLATE-SERVICE-UPGRADE.md)

**Upgrade an existing service**
1. 📖 Read [TEMPLATE-SERVICE-UPGRADE_PLAN.md](TEMPLATE-SERVICE-UPGRADE_PLAN.md)
2. 📂 Compare with Template Service pattern
3. 🔧 Follow the upgrade checklist

**Write tests for my service**
1. 📖 Review [TEST-RESULTS-PHASE2.md](TEST-RESULTS-PHASE2.md)
2. 📂 Check Template Service tests
3. ✍️ Create similar test scripts

---

## 🏗️ Service Architecture Overview

### Current Services

| Service | Port | Status | Pattern |
|---------|------|--------|---------|
| **Template** | 3002 | ✅ Production-ready | Reference implementation |
| **IAM** | 3000 | ✅ Upgraded | Identity & Access Management |
| **CBM** | 3001 | ⚠️ Basic | Needs upgrade |

### Production Features Checklist

All services should include:

- ✅ Health check endpoint (`/health`)
- ✅ Error standardization (GlobalExceptionFilter)
- ✅ Correlation ID tracking (CorrelationIdMiddleware)
- ✅ RBAC integration (BaseService)
- ✅ Audit trail (createdBy/updatedBy)
- ✅ Modern controller pattern (@CurrentUser)
- ✅ Swagger documentation with error schemas
- ✅ JWT authentication (JwtStrategy)
- ✅ Pagination support (PaginationQueryDto)
- ✅ Soft delete functionality

---

## 📖 Document Descriptions

### CLAUDE.md
**Purpose:** Main instructions for AI Agent
**Contents:**
- Development workflow principles
- Issue-based workflow
- Common commands
- Architecture overview
- Service creation workflow

**Target Audience:** AI Agent (Claude Code)

### TEMPLATE-SERVICE-UPGRADE.md
**Purpose:** Requirements specification for production-ready services
**Contents:**
- Executive summary
- Current state analysis
- Technical requirements (4 phases)
- Implementation details
- Testing strategy

**Target Audience:** Developers & Agent

### TEMPLATE-SERVICE-UPGRADE_PLAN.md
**Purpose:** Implementation tracking document
**Contents:**
- Phase-by-phase task breakdown
- Progress tracking (97.5% complete)
- Change log
- Time estimates vs actuals
- Test results

**Target Audience:** Project managers & Developers

### QUICK-PROMPT-NEW-SERVICE.md ⭐
**Purpose:** Quick templates for creating new services
**Contents:**
- Copy-paste prompt templates
- Real-world examples
- One-liner prompts
- Verification steps

**Target Audience:** Anyone creating new services

### PROMPT-NEW-SERVICE-CREATION.md
**Purpose:** Comprehensive service creation guide
**Contents:**
- Detailed prompt templates
- Entity specification format
- Queue integration patterns
- Common mistakes to avoid
- Pro tips

**Target Audience:** Developers creating complex services

### TEST-RESULTS-PHASE2.md
**Purpose:** RBAC testing documentation
**Contents:**
- Test scenarios
- Test script (`test-rbac.sh`)
- Test results (8/8 passed)
- curl command examples

**Target Audience:** QA & Developers

---

## 🔗 Related Resources

### Code References

**Template Service (Reference Implementation):**
- Location: `services/template/`
- README: `services/template/README.md`
- Main: `services/template/src/main.ts`
- AppModule: `services/template/src/app/app.module.ts`

**Base Libraries:**
- Base: `libs/base/src/`
- Shared: `libs/shared/src/`

**Example Modules:**
- Simple Entity: `services/template/src/modules/category/`
- Complex Entity: `services/template/src/modules/product/`
- Queue Example: `services/template/src/queues/`

### External Documentation

- **NestJS:** https://docs.nestjs.com/
- **Mongoose:** https://mongoosejs.com/docs/
- **Nx Workspace:** https://nx.dev/
- **Swagger/OpenAPI:** https://swagger.io/docs/

---

## 🤝 Contributing to Documentation

### When to Update

Update documentation when:
- ✅ New features added to Template Service
- ✅ New service created
- ✅ Architecture patterns change
- ✅ Common issues discovered
- ✅ Best practices updated

### Documentation Standards

- **Use Markdown** - All docs in `.md` format
- **Include Examples** - Real code snippets and commands
- **Keep Updated** - Update date on changes
- **Be Concise** - Clear and to the point
- **Use Emojis** - For better readability (optional but encouraged)

### File Naming Convention

- `TEMPLATE-*.md` - Template Service related
- `PROMPT-*.md` - Prompt templates for Agent
- `TEST-*.md` - Testing documentation
- `*-PLAN.md` - Implementation tracking
- `README.md` - Index/navigation files

---

## 💡 Tips for Using Documentation

### For Developers

1. **Start with CLAUDE.md** - Understand overall architecture
2. **Review Template Service** - See patterns in action
3. **Use prompt templates** - Don't reinvent the wheel
4. **Follow checklists** - Ensure nothing is missed

### For AI Agent

1. **Read CLAUDE.md first** - Understand context and workflow
2. **Reference Template Service** - Copy patterns exactly
3. **Use prompt templates** - Structure for service creation
4. **Track progress** - Use TODO system for complex tasks

### For Project Managers

1. **Check upgrade plan** - See implementation status
2. **Review test results** - Understand quality metrics
3. **Monitor time estimates** - Track actual vs estimated hours

---

## 📞 Support

**Questions about:**
- **Architecture** → See [../CLAUDE.md](../CLAUDE.md)
- **Service Creation** → See [QUICK-PROMPT-NEW-SERVICE.md](QUICK-PROMPT-NEW-SERVICE.md)
- **Testing** → See [TEST-RESULTS-PHASE2.md](TEST-RESULTS-PHASE2.md)
- **Features** → See [TEMPLATE-SERVICE-UPGRADE.md](TEMPLATE-SERVICE-UPGRADE.md)

---

**Last Updated:** 2025-10-17
**Version:** 1.0
