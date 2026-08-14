# LiftOff Community Modules

Community-contributed learning modules for [LiftOff](https://github.com/Postman-DevRel/liftoff) — Postman's hands-on learning platform.

## What is this?

This repo is where the community submits new learning modules for LiftOff. Each module teaches a Postman skill through hands-on, step-by-step lessons with automated validation.

**This is not the LiftOff app itself** — it's the submission pipeline. Modules that pass review here get promoted into the main LiftOff app.

## Submit a module

1. Fork this repo
2. Copy `module-template/` to `modules/your-module-name/`
3. Write your `content.md` using the structured format (H1 title, H2 Parts, H3 Steps)
4. Run `npm run generate modules/your-module-name` to generate `module.json` and validator stubs
5. Run `npm run preview modules/your-module-name` to preview in the browser
6. Run `npm test` to validate
7. Open a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for the submission process and [Authoring Guide](docs/authoring-guide.md) for detailed content writing guidance.

## Commands

```bash
npm install                                    # Install dependencies
npm run generate modules/your-module-name      # Generate module.json from content.md
npm run preview modules/your-module-name       # Preview module at http://localhost:3333
npm test                                       # Validate all modules
```

## Repo structure

```
├── modules/                  # Community module submissions (one dir per module)
│   └── your-module-name/
│       ├── content.md        # Authored content (source of truth)
│       ├── module.json       # Generated module definition
│       ├── badge.png         # Badge image (optional)
│       └── validators/       # Generated validator stubs
├── module-template/          # Starter template — copy this
├── schema/                   # JSON Schema for module.json
├── scripts/                  # Generator, preview server, and CI validation
└── .github/workflows/        # GitHub Actions CI
```

## License

MIT
