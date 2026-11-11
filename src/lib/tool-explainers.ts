/**
 * "How it works" copy for each calculator page, rendered on the server below the tool
 * (`src/components/how-it-works.tsx`). Every sentence restates a formula in `src/lib/albion/*` as
 * documented in docs/CALCULATORS.md; numbers are the game constants those files hold (return bonus
 * 18 / 15 / 40 / +10 or +20 daily / +59 focus, enchanting counts, the 4% and 8% sales tax), never
 * examples with made-up prices. Change the copy in the same PR as the formula.
 */
export type ToolExplainer = {
  /** What the tool works out, in one or two sentences. */
  computes: string;
  /** What the player enters or picks. */
  inputs: string;
  /** The key formula in words; one short paragraph each. */
  math: string[];
  /** The guide that explains the mechanic, if one exists (a slug in public/library/grind-guides.json). */
  guide?: { slug: string; title: string };
};

const prices =
  "Prices load from the Albion Online Data Project with the time each was seen, or you type your own; a missing price leaves the result unavailable, never zero.";
const tax = "sales tax (4% with Premium, 8% without)";
const returnRate =
  "The return rate is bonus ÷ (100 + bonus). Each crafting city starts at a bonus of 18 and the daily bonus adds 10 or 20; focus adds 59.";
const production = (what: string) =>
  `Returned materials = cost of the materials that can come back × return rate. Profit = sale − tax and setup fee − (materials − returned materials + the recipe's own silver + station fee). The cash profit beside it leaves returns out, so you also see the silver ${what} needs up front.`;
const rrr = { slug: "focus-and-resource-return-rate", title: "Focus and RRR" };

export const toolExplainers: Record<string, ToolExplainer> = {
  "/tools/crafting": {
    computes:
      "What a crafting run makes: the item's sale after tax and the sell order setup fee, minus everything it cost, with the materials that come back from resource returns counted as savings.",
    inputs: `A recipe, the number of crafts and the item quality; the city you buy materials in and the one you sell in; a price for each material and for the item; your return rate and focus; the station fee, ${tax} and setup fee. ${prices}`,
    math: [
      production("the run"),
      `${returnRate} The city that specialises in the item's category adds 15, so with no extras the rate is 18 ÷ 118 ≈ 15.3%. Selling to the Black Market is charged tax only.`,
    ],
    guide: rrr,
  },
  "/tools/refining": {
    computes:
      "What a refining run makes: the refined resource's sale after tax and setup fee, minus the raw and refined inputs, with resource returns counted as savings.",
    inputs: `A refined resource and tier, the number of refines, the cities you buy and sell in, a price for each input and for the output, your return rate and focus, the station fee, ${tax} and setup fee. Output quality is always normal. ${prices}`,
    math: [
      production("the run"),
      `${returnRate} The city that refines that resource adds 40: Fort Sterling wood, Lymhurst fiber, Bridgewatch stone, Martlock hide, Thetford ore. There the rate is 58 ÷ 158 ≈ 36.7%, or 117 ÷ 217 ≈ 53.9% with focus.`,
    ],
    guide: rrr,
  },
  "/tools/cooking": {
    computes:
      "What a batch of meals makes: the meals' sale after tax and setup fee, minus the ingredients and fees, with resource returns counted as savings.",
    inputs: `A meal, the number of crafts, the cities you buy and sell in, a price for each ingredient and for the meal, your return rate and focus, the station fee, ${tax} and setup fee. Output quality is always normal. ${prices}`,
    math: [
      `Sale = meal price × meals per craft × crafts. ${production("the batch")}`,
      `${returnRate} Caerleon adds 15 for food, so with no extras the rate is 18 ÷ 118 ≈ 15.3%.`,
    ],
    guide: rrr,
  },
  "/tools/alchemy": {
    computes:
      "What a batch of potions makes: the potions' sale after tax and setup fee, minus the ingredients and fees, with resource returns counted as savings.",
    inputs: `A potion, the number of crafts, the cities you buy and sell in, a price for each ingredient and for the potion, your return rate and focus, the station fee, ${tax} and setup fee. Output quality is always normal. ${prices}`,
    math: [
      `Sale = potion price × potions per craft × crafts. ${production("the batch")}`,
      `${returnRate} Brecilien adds 15 for potions, so with no extras the rate is 18 ÷ 118 ≈ 15.3%.`,
    ],
    guide: rrr,
  },
  "/tools/enchanting": {
    computes:
      "Whether enchanting an item at the Artifact Foundry pays: the enchanted item's sale after tax and setup fee, minus the item you start from, the runes, souls or relics and any upgrade fee.",
    inputs: `The equipment, its tier, the enchantment you start from and the one you want, the cities you buy and sell in, a price for the base item, each material and the result, and the ${tax} and setup fee. ${prices}`,
    math: [
      "Each step needs one material: a rune for .0 to .1, a soul for .1 to .2, a relic for .2 to .3. A helmet, shoes, cape or off-hand takes 96 per step, armor or a bag 192, a one-handed weapon 288 and a two-handed weapon 384.",
      "Profit = sale − tax and setup fee − (base item + materials + upgrade fee). Focus and resource returns don't apply to enchanting, so nothing comes back.",
    ],
    guide: { slug: "enchanting-guide", title: "Enchanting" },
  },
  "/tools/farming": {
    computes:
      "What one harvest of a crop or herb makes in cash, and what it is worth once the seeds you get back are counted.",
    inputs: `A crop, how many seeds you plant and how many you water with focus, the harvest per plant, the seed yield with and without water, the seed and produce prices in the cities you buy and sell in, the purchase fee, ${tax} and any other costs. ${prices}`,
    math: [
      "Upfront silver = seeds × seed price, plus the purchase fee and other costs. Cash profit = plants × harvest per plant × produce price, less the sale fee, minus upfront silver.",
      "Seeds back = unwatered plants × unwatered yield + watered plants × watered yield. Profit adds those seeds at the seed price, and silver per focus counts only the extra seeds watering brings.",
    ],
    guide: { slug: "islands-and-farming-guide", title: "Islands and farming" },
  },
  "/tools/fishing": {
    computes:
      "Two things: whether a catch is worth more sold whole or chopped into Chopped Fish, and how many fish a fishing fame target takes and what they cost.",
    inputs: `For chopping: the fish, how many, the purchase price and fee, the whole and chopped sale prices, the sale fee and the chopping cost. For leveling: the fame you want, the fame each fish gives and its price. ${prices}`,
    math: [
      "Chopping: pieces = fish × pieces per fish. Chopping is worth (pieces × chopped price − chopping cost) − fish × whole price more, with both sales taken after the sale fee. Break-even is the chopped price at which the sale pays back the fish and the chopping.",
      "Leveling: fish needed = fame target ÷ fame per fish, rounded up to a whole fish; the cost is fish needed × price plus the purchase fee.",
    ],
    guide: { slug: "fishing-leveling-guide", title: "Leveling fishing" },
  },
  "/tools/flipping": {
    computes:
      "Which items sell for more in another city than they cost in yours, and, for one trade, the profit, margin and lowest sale price that still pays.",
    inputs: `For a route scan: the two cities, the items (up to 25), the quality, whether you sell at once or list, ${tax} and setup fee. For one trade: buy and sell price, quantity, whether you buy instantly or with a buy order, fees and transport. ${prices}`,
    math: [
      "Profit = sale × quantity − purchase × quantity − buy order fee − transport − sale × quantity × (tax + setup fee). An instant purchase uses the lowest sell order; an instant sale uses the highest buy order; a listing uses the lowest sell order at the destination.",
      "Break-even is the sale price where profit is zero; the lowest profitable sale is the next whole silver above it. Relisting and items that never sell aren't counted.",
    ],
    guide: { slug: "market-flipping-guide", title: "Market flipping" },
  },
  "/tools/black-market": {
    computes:
      "Which gear the Black Market in Caerleon buys for more than the cheapest player city sells it, and the net per item after tax.",
    inputs: `A gear category, a tier range, the quality and your ${tax}. Prices come from the Albion Online Data Project, each with its own age; a missing order is shown as missing.`,
    math: [
      "Buy = the lowest sell order for the exact item and quality in any city except the Black Market. Sale = the Black Market's highest buy order, filled instantly, so there is no setup fee.",
      "Net = sale − sale × tax − buy, and margin = net ÷ sale. How many the Black Market wants, the haul to Caerleon and its danger aren't counted.",
    ],
    guide: { slug: "reading-market-prices", title: "Reading market prices" },
  },
  "/tools/profitable-crafts": {
    computes:
      "A ranking of every recipe in a category by profit, run through the same engine as the Crafting calculator with your cities, returns, tax and budget.",
    inputs: `A category, tier, enchantment and quality; the city you buy materials in, craft in and sell in; the daily bonus, ${tax}, the setup fee and an optional budget. Prices come from the Albion Online Data Project, each with its own age.`,
    math: [
      "Each recipe buys materials at the lowest sell order, gets the crafting city's returns on every returnable material, and lists the item at the lowest sell order where you sell (the Black Market's highest buy order there, without setup fee). One craft, no focus.",
      "Without a budget, rows rank by profit per craft. With one, crafts = budget ÷ upfront cost, rounded down, and rows rank by profit × crafts. A recipe with a missing price is listed apart, never as zero.",
    ],
    guide: { slug: "real-profit", title: "Real profit" },
  },
  "/tools/transporting": {
    computes:
      "What a haul from one city to another makes after the trips it takes, the risk you allow for and the tax at the other end.",
    inputs: `The item and quality, how many, the city you buy in and the one you sell in, whether you sell at once or list, the item weight (filled in from game data), your mount's carry weight, the cost per trip, a risk allowance, ${tax} and setup fee. ${prices}`,
    math: [
      "Trips = quantity × item weight ÷ carry weight, rounded up, at least one. Transport cost = trips × cost per trip + risk.",
      "Profit = sale − purchase − transport cost − tax, and the setup fee too when you list instead of selling to a buy order.",
    ],
    guide: { slug: "transport-guide", title: "Transporting" },
  },
  "/tools/laborers": {
    computes:
      "Whether sending laborers out with full journals pays: the loot they bring back and the empty journals you sell, against what the full journals cost.",
    inputs: `The laborer, the journal tier, your house tier, the number of journals, the full and empty journal prices, a price for each kind of loot, and the ${tax} and setup fees. ${prices}`,
    math: [
      "Loot per journal = the laborer's loot amount for that journal tier × the house factor, which depends on how the house tier compares with the journal tier. The value per unit is the average of the loot prices, weighted by how often each drops.",
      "Profit = loot value + any empty journals you sell, both after tax and setup fee, − full journals × price (plus the buy order fee). Unpriced loot counts as nothing, so the result is then a lower bound.",
    ],
  },
  "/tools/mastery": {
    computes:
      "How much focus each craft, refine, meal and potion costs at your specialization levels. Every production calculator uses these levels for its focus figures.",
    inputs:
      "Your level, 0 to 100, in each crafting, refining, cooking and alchemy specialization on the Destiny Board. Signed in, they are saved to your account; otherwise they stay in this browser.",
    math: [
      "Each level adds focus efficiency to the items its node covers: the general mastery to the whole line, the specialization more to its own item. Efficiency = the sum of level × efficiency per level over every matching node.",
      "Focus per craft = base focus ÷ 2^(efficiency ÷ 10,000), so every 10,000 efficiency halves it. The station rounds the final figure, so the game can show one focus more or less.",
    ],
    guide: rrr,
  },
};
