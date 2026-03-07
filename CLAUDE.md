# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A documentation/blog site built with **Docusaurus 3.8.1** (React-based static site generator). The content focuses on Cloud, DevOps, and technical documentation in Korean.

## Build & Run Commands

```bash
npm start          # Dev server with hot reload (runs prestart scripts)
npm run build      # Production build (runs prebuild scripts)
npm run serve      # Serve production build locally
npm run clear      # Clear Docusaurus cache
```

Utility scripts:
```bash
npm run copy-images   # Copy images from docs/*/assets to static/img
npm run update-fm     # Auto-update markdown frontmatter metadata
```

## Architecture

### Directory Structure

- **docs/** - Main content (MDX files organized in numbered folders like `01-Kubernetes/`, `03-Docker/`)
- **src/components/** - React components (SelectedPosts.js for homepage featured posts, GiscusComponent.js for comments)
- **src/theme/** - Docusaurus theme overrides (DocCard, DocItem, DocSidebar)
- **plugins/gather-meta-plugin.js** - Custom plugin that aggregates post metadata for listing components
- **scripts/** - Automation scripts for image copying and frontmatter updates
- **k8s/resource/** - Kubernetes deployment manifests

### Key Custom Systems

**Image Management**: Images placed in `docs/*/assets/` are automatically copied to `static/img/` on build/start. The script removes numeric prefixes from folder names.

**Metadata Plugin** (`plugins/gather-meta-plugin.js`): Scans all docs, extracts frontmatter, and provides `recentPosts` and `postsByPath` global data for components.

**Frontmatter Auto-Update** (`scripts/update-frontmatter.js`): Automatically adds missing image references, sets `sidebar_class_name: hidden-sidebar-item` on non-index files, and fixes common YAML issues.

### Featured Posts

To change homepage featured posts, edit the `SELECTED_POST_IDS` array in `src/components/SelectedPosts.js`.

## Deployment

- **Docker**: Multi-stage build (Node 20 → Nginx)
- **CI/CD**: GitHub Actions builds and pushes to AWS ECR on main branch commits
- **Kubernetes**: Auto-updates image tag in `k8s/resource/deploy.yaml`

Commits to the `k8s/` folder do not trigger the build pipeline to prevent infinite loops.

## Configuration

- **docusaurus.config.js** - Main config (Algolia search, Google Analytics, site metadata)
- **sidebars.js** - Auto-generated from docs structure
- Node requirement: >=18.0
