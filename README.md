# RoutePulse — Campus in motion

A working hackathon demo for **PS 02: Optimise Campus Transport Under Real Constraints**.

From this folder:

```powershell
npm start
```

Open **http://localhost:4173**. No install or API keys needed; requires Node.js 22+.

The app has dedicated **Operator** and **Student** dashboards with a distinct blue/navy identity and larger text. Operator tools include campus map replay, demand forecasts, four disruption scenarios, a constraint-checked dispatch optimizer and a reproducible baseline evidence report. Students get GPS-driven arrival windows, per-leg capacity proofs, accessible journeys, uncertainty-aware transfers and arrival-deadline checks. Manage data imports validated organizer datasets; malformed files preserve the current model. Open **http://localhost:4173/#student** or use the Student switch in the header.

At seed 2026, the normal proposed plan reduces mean elapsed waiting **7.75 → 6.33 minutes (18.32%)** and late/overdue journeys **26 → 6**, with approximately 109 additional vehicle-minutes. All four proposed scenario plans are feasible. Congestion shows its unfavorable waiting trade-off openly.

- [Full documentation](routepulse/README.md)
- [Three-minute judging walkthrough](routepulse/DEMO.md)
- [Published evaluation results](routepulse/data/evaluation.json)
- [Desktop preview](routepulse/artifacts/overview-desktop.png)

Run `npm test` for the 23 simulation checks, or `npm run evaluate` to regenerate the common datasets. The completed app runs locally, and `routepulse/dist/` can be deployed to any static web host.
