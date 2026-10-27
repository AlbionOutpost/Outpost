# Albion language in Outpost

Write for players. Use short task names and explain an unfamiliar term where it affects a decision. Keep stored identifiers, API kinds and export formats stable when changing UI labels.

| Use                    | Meaning in the interface                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Comp / comps           | A party plan with roles, player slots and loadouts. Use instead of “composition” in navigation and controls.  |
| Build / loadout        | One player's equipment, abilities and swaps. Do not call it meta or recommended without supporting evidence.  |
| Swaps                  | Alternative equipment recorded for a build or player slot.                                                    |
| IP                     | Item power. Distinguish imported base IP from an author's recommended IP.                                     |
| Spec                   | Equipment specialization. Do not infer levels or effects from a loadout.                                      |
| RRR                    | Resource return rate. Show its source or that it is a manual assumption.                                      |
| Buy order / sell order | Use the game's order terminology rather than “bid/ask.” Observed prices are not guaranteed executable trades. |
| Guild workspace        | An Outpost space for a guild/group. Creating it does not create or verify an in-game guild.                   |
| Focus                  | Preserve sourced mechanics and manual assumptions; never invent a recovery timer.                             |

Use existing activity tags (such as ZvZ, Small Scale PvP and Solo Mists) without silently rewriting stored values or implying a current meta. Keep tier/enchantment notation, quality names and source dates consistent. Unknown abilities, unlock requirements and current-patch status stay unknown. Use direct headings such as “Edit comp” and “Transport calculator”; avoid slogans and internal engineering explanations in task flows.
