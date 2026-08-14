# LiftOff Community Modules

Community-contributed learning modules for [LiftOff](https://github.com/Postman-DevRel/liftoff) — Postman's hands-on learning platform.

## What is this?

This repo is where the community submits new learning modules for LiftOff. Each module teaches a Postman skill through hands-on, step-by-step lessons with automated validation.

**This is not the LiftOff app itself** — it's the submission pipeline. Modules that pass review here get promoted into the main LiftOff app.

## Submit a module

1. Fork this repo
2. Copy `module-template/` to `modules/your-module-name/`
3. Write your `module.json`, `content.md`, and validator stubs
4. Run `npm test` to validate locally
5. Open a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Repo structure

```
├── modules/                  # Community module submissions (one dir per module)
│   └── your-module-name/
│       ├── module.json       # Module definition
│       ├── content.md        # Long-form overview
│       ├── badge.png         # Badge image (optional)
│       └── validators/       # Validator stub files
├── module-template/          # Starter template — copy this
├── schema/                   # JSON Schema for module.json
├── scripts/                  # CI validation scripts
└── .github/workflows/        # GitHub Actions CI
```

## Validate locally

```bash
npm install
npm test
```

## License

MIT
