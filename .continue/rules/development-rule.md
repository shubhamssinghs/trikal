---
description: Enforces reuse of existing architecture, clean code organization, minimal comments, and linting compliance.
---

# Architectural Integrity and Code Organization Rules

## 1. Architecture & Component Reuse

- **Check Existing Code First**: Before creating any new plan, architectural decision, service, controller, utility, or logic change, you must audit the existing codebase.
- **Prioritize Reuse**: If a similar service, helper, or structure already exists, reuse or extend it. Do not duplicate functionality. Only design something completely new if existing solutions cannot fulfill the requirement.

## 2. Code Organization & Refactoring

- **Separation of Concerns**: Code must always be refactored into its proper domain.
- **Utility Code**: Place reusable, generic helper functions inside the dedicated `util/` or `utils/` directory.
- **Type Definitions**: Place TypeScript interfaces, types, and schemas strictly inside a dedicated `types/` folder or adjacent `.types.ts` files.
- **Domain Specifics**: Ensure controllers, services, components, and hooks reside strictly within their designated architectural layers.

## 3. Commenting Guidelines

- **No Line-by-Line Comments**: Do not leave comments on every line of code.
- **High-Level Only**: Only document complex, non-obvious logic or architectural decisions.
- **Clean Output**: Never write comments that simply repeat what the code itself explicitly states.

## 4. Code Quality & Linting

- **Production Ready**: All frontend changes must be syntactically correct and follow standard formatting guidelines.
- **Post-Change Verification**: After finalizing any frontend modifications, always prompt or trigger the project's linter (`npm run lint` or equivalent) to verify code health and catch styling errors.
