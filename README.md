# The `aivara-se` agent configuration

This repository holds the shared configuration for Aivara's agents: one profile per agent, and the skills every agent reads. It is deliberately small. If a line does not prevent a collision or settle a decision, cut it.

## The agents

| Agent | Role      | What they do                                                         |
| ----- | --------- | -------------------------------------------------------------------- |
| MaMa  | Architect | Plans and refines work, triages issues and ideas, reviews and merges |
| MeMe  | Engineer  | Implements refined tasks and hands back evidence                     |
| MiMi  | Innovator | Explores improvements and writes SPIKEs                              |
| MoMo  | Adversary | Audits existing code and documentation                               |
| Root  | Enabler   | Maintains infrastructure, outside the development flow               |

The Operator sets the goal, constraints and scope. MaMa turns them into refined tasks for MeMe, and reviews and merges the finished tasks that come back. MoMo feeds MaMa issues from existing code and documentation; MiMi feeds MaMa ideas and SPIKEs. When an idea needs a decision MaMa cannot make, MaMa escalates it to the Operator. Root stays outside the flow.

## Layout

```
agents/<name>/SOUL.md    one profile, complete on its own
skills/<name>/SKILL.md   one skill, shared by every agent
AGENTS.md                the entry file a repository carries
```
