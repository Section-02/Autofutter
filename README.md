# Autofutter

## Final Product & Implementation Specification --- V1

This README is the authoritative specification for Autofutter. Codex
should read it completely before
implementation. Do not silently change product behavior, add features
because other nutrition apps have them, or substitute a more complicated
workflow for one defined here.

------------------------------------------------------------------------

# 1. Product

A private, local-first iPhone application for fast, weight-based food
and nutrition tracking.

The user cooks primarily from scratch, owns a food scale, prefers grams
to volume measurements, eats many of the same foods repeatedly, and
wants substantially less friction than commercial calorie trackers.

The primary loop is:

**Open → Add Food → Select Food → Enter Grams → Add to Log**

The app is a measuring instrument, not a coach. It records and
calculates. It does not shame, nag, gamify, celebrate, or assign
morality to food.

## V1 includes

-   iPhone 11 and newer support
-   Daily food logging
-   Gram-based food entry
-   Grams / Freedom Units measurement preference
-   Local reusable food library
-   Custom foods
-   Optional standard portions for reusable foods
-   USDA FoodData Central lookup
-   Recipes built from weighted foods
-   Recipe variations for substitutions
-   Restaurant / Quick Entry
-   Calories, protein, total fat, carbohydrates, sodium, cholesterol
-   Daily calorie goal
-   Protein minimum
-   Adjustable calorie tolerance
-   Effective-dated goal history
-   Body-weight tracking
-   Weight, calorie, and combined progress graphs
-   Three months of detailed food history
-   Permanent daily nutrition history
-   Permanent weight history
-   Local SQLite database
-   Versioned portable JSON flat-file backup/restore
-   Soft delete for reusable foods and recipes
-   Automated tests for math, persistence, retention, and critical
    workflows

## Explicitly out of scope for V1

Do not implement AI/photo estimation, food recognition, barcode
scanning, copy-previous-day/meal, advanced offline features, offline
USDA data, a restaurant database, Android, web, accounts,
authentication, a custom backend, live cloud database sync, multi-user
features, social/sharing, gamification, streaks, meal reminders,
missing-meal warnings, diet coaching, required meal categories, dark
mode, micronutrients, subscriptions, telemetry, analytics, or automatic
calorie-goal adjustment.

Do not pre-build speculative V2 infrastructure.

------------------------------------------------------------------------

# 2. UX Rules

1.  Food logging has priority over every other workflow.
2.  Common actions require as few taps as practical.
3.  Never ask the user to perform arithmetic the app can reliably
    perform.
4.  No required Breakfast/Lunch/Dinner/Snack categories.
5.  Fasting requires no action and produces no warning.
6.  Prefer direct navigation over intermediary menus.
7.  Secondary functions remain visually subordinate.
8.  Do not add confirmations except where destructive actions justify
    them.
9.  When a requirement is ambiguous, prefer fewer user actions while
    preserving data integrity.
10. Do not imitate MyFitnessPal or another tracker when its conventions
    conflict with this spec.

------------------------------------------------------------------------

# 3. Navigation

Persistent bottom navigation contains exactly:

1.  **Log**
2.  **Foods**
3.  **Recipes**
4.  **Progress**

Use clear icons plus short labels. Log is the default launch screen.

Settings is accessed by a small gear icon from primary screens. It is
not a bottom tab.

The large **+ ADD FOOD** button is a persistent primary action
immediately above the bottom navigation on Log. It is not a tab.

------------------------------------------------------------------------

# 4. Log Screen

Order:

1.  Header/settings access
2.  Date navigation
3.  Calorie gauge
4.  Protein progress
5.  Reference nutrition
6.  Chronological food entries
7.  Persistent + Add Food
8.  Bottom navigation

## Date navigation

Example:

``` text
‹        Friday, August 21        ›
```

Left = previous day. Right = next day and is disabled on today. Tapping
the date opens a date picker. Do not support future logging in V1.

## Calorie gauge

The gauge is the strongest visual element. It is an arc, not a
360-degree ring. The normal gauge ends at approximately **4 o'clock**.

Center:

``` text
574
LEFT
```

or:

``` text
50
OVER
```

Below:

``` text
1,426 / 2,000 kcal
```

The user has an exact calorie target and configurable ± tolerance.

Example: 2,000 target, ±10% tolerance = 1,800--2,200 acceptable range.

-   Below 1,800: filled portion is **green**.
-   At 1,800: state becomes **orange**.
-   At 2,000: normal arc reaches full at 4 o'clock.
-   From 2,000 through 2,200: normal arc remains full and orange at 4
    o'clock.
-   Above 2,200: a **red extension** begins beyond 4 o'clock and
    progresses toward approximately 5 o'clock.
-   Exactly the upper boundary remains acceptable/orange.
-   The gauge never wraps.
-   Changing tolerance changes the red threshold, not where normal full
    occurs.

The gauge is informational, not punitive.

## Protein

Protein has a minimum, never a maximum.

``` text
PROTEIN                         112 / 160 g
██████████████████──────────────
48 g to minimum
```

Once reached:

``` text
174 / 160 g
Minimum reached
```

Use the app's purple accent. No overflow warning or red state.

## Other nutrition

Quiet 2×2 grid:

``` text
TOTAL FAT                  CARBS
49 g                       137 g

SODIUM                     CHOLESTEROL
1,420 mg                   212 mg
```

No goals, Daily Value percentages, progress bars, or warning colors.

## Tracked nutrition

Exactly:

-   Calories --- kcal
-   Protein --- g
-   Total fat --- g
-   Carbohydrates --- g
-   Sodium --- mg
-   Cholesterol --- mg

## Food rows

Chronological order; no meal grouping.

``` text
Homemade Chili        250 g        412
Eggs                   142 g        220
Homemade Bread          73 g        191
```

Store timestamps for ordering; displaying time is unnecessary.

Empty day:

``` text
No food logged today.
```

No skipped-meal warning.

## Edit logged entry

Tapping a row opens the entry editor. For weighed food:

``` text
HOMEMADE CHILI

Amount
[ 250 ] g

412 kcal

Protein       27 g
Fat           18 g
Carbs         36 g
Sodium       640 mg
Cholesterol   54 mg

[ SAVE CHANGES ]

Delete Entry
```

Changing grams recalculates immediately. Editing the log entry never
edits the underlying Food/Recipe.

------------------------------------------------------------------------

# 5. Add Food

Tap **+ ADD FOOD** and go directly here; no intermediary menu.

``` text
‹ Log                    ADD FOOD

[ Search your foods... ]

RECENT

Eggs
Homemade Bread
Homemade Chili
Greek Yogurt
Butter
Rice
Chicken
Potatoes

────────────────────────

+ Create Custom Food
Search USDA
Restaurant / Quick Entry
```

Use one smart Recent list. Ranking may consider recency and frequency.

Local search queries SQLite only. As typing begins, Recent disappears
and matching local Foods plus completed Recipes appear. USDA results
never silently mix into local results.

No match:

``` text
No foods found for "sirloin steak"

+ Create "Sirloin Steak"
Search USDA for "Sirloin Steak"
```

Carry the search query into the selected workflow.

Completed Recipes behave like Foods during logging. The user should not
have to remember which technical entity type something is.

## Food amount

``` text
CHICKEN BREAST

How much?
[ 150 ] g

248 kcal

Protein       46 g
Total Fat      5 g
Carbs          0 g
Sodium       111 mg
Cholesterol  128 mg

[ ADD TO LOG ]
```

Auto-focus the gram field with numeric keyboard.

Normal path: **Select → type grams → Add → return to Log.**

If a Food has a standard portion, offer a compact choice between direct
grams and that portion. For example, `1 stick = 28 g`. A portion count
is converted to grams before using the existing nutrition calculation
and log storage. Direct gram entry always remains available. Recipes do
not require standard portions.

## Freedom Units foundation

The measurement preference is either `Grams` or `Freedom Units`, with
`Grams` as the default. Freedom Units are an input and display layer;
grams remain the canonical internal unit for stored food weights and all
nutrition calculations.

Volume units use these exact relationships:

-   1 cup = 16 tablespoons
-   1 tablespoon = 3 teaspoons
-   1 cup = 48 teaspoons

These relationships permit volume-to-volume conversion only. Never
perform a generic conversion from teaspoons, tablespoons, or cups to
grams. A volume amount may resolve to grams only when the selected Food
provides a food-specific conversion. Until such a conversion is
available, preserve the existing gram workflow.

------------------------------------------------------------------------

# 6. Foods

Foods manages the local reusable library.

``` text
FOODS

[ Search foods... ]

SORT: Most Used ▾

Eggs
155 kcal / 100 g

Homemade Bread
262 kcal / 100 g

Ground Beef 80/20
254 kcal / 100 g

Greek Yogurt
89 kcal / 170 g

[ + ADD FOOD ]
```

Default sort: Most Used. Also support Recently Used, A--Z, Recently
Added.

No categories, tags, folders, or pantry system in V1.

Foods → + Add Food offers only:

-   Create Custom Food
-   Search USDA

Quick Entry is not a reusable Food.

## Create/Edit Food

One shared form:

``` text
NAME
[ Chicken Breast ]

NUTRITION FACTS

These nutrition facts are for:
[ 150 ] g

Calories       [ 248 ] kcal
Protein        [ 46 ] g
Total Fat      [ 5 ] g
Carbohydrates  [ 0 ] g
Sodium         [ 111 ] mg
Cholesterol    [ 128 ] mg
```

All six values are required for reusable Foods. A true zero is entered
as 0. Reference weight must be positive.

Foods may also define one optional standard portion in the shared form:

``` text
STANDARD PORTION (OPTIONAL)
1 [ stick ] = [ 28 ] g
```

The portion label and positive gram weight must be supplied together.
Existing Foods and Foods that do not need a standard portion leave both
values blank.

Source values may contain decimals.

### Reference weight

Never force 100 g. The reference weight is simply the amount represented
by the nutrition facts. If a package says 112 g, store 112 g.

If the reference weight is changed, the app may proportionally
recalculate all nutrient values. The user may override the recalculated
values. The user should never need to manually normalize to 100 g.

### Save & Use

From Add Food:

**Create → Save & Use → enter consumed grams → Add to Log → Log**

Do not make the user search again.

From Foods:

**Save Food → Foods**

## Editing and history

All local Foods are editable, including USDA imports. Changes affect
future use only. Historical logs remain snapshots.

## Soft delete

Foods and Recipes use soft deletion. Deleted entities disappear from
normal lists/search but may be restored. Do not allow deletion to leave
active Recipes with broken ingredient references.

------------------------------------------------------------------------

# 7. USDA FoodData Central

USDA is the V1 external nutrition source and requires internet access.

Offline message:

``` text
USDA search requires an internet connection.
```

Retry a transient connection or USDA server failure up to two times with
short delays before showing an error. Do not retry rate-limit or other
non-transient responses. There is no offline USDA search database or
background retry queue. Food-specific portion conversions already
imported with a saved Food are stored locally and remain usable offline.

Flow:

**Search → Select → Review/Edit → Save**

Prefer useful generic USDA entries over branded entries when both fit.

Selecting a result performs one full Food Details request, then opens the
standard Food form prepopulated with mapped USDA data. Do not request full
details for every search result, and do not save merely because the result
was tapped. If the detail request fails, preserve the search result and
fall back to grams rather than inventing a conversion.

Import only:

-   Name
-   USDA/FDC identifier
-   Reference weight
-   Calories
-   Protein
-   Total fat
-   Carbohydrates
-   Sodium
-   Cholesterol
-   Valid food-specific portion descriptions, quantities, and gram weights
-   Minimal provenance metadata

Foundation, FNDDS, and SR Legacy details may provide `foodPortions`.
Branded details may instead provide a gram serving size with household
serving text. Cache only positive, interpretable conversions. Treat
teaspoon, tablespoon, and cup as normalized volume units where present;
retain other useful labels such as slice, stick, or piece without assuming
a density. Discard unusable portions such as "quantity not specified".
After import, it is an ordinary local editable Food.

------------------------------------------------------------------------

# 8. Recipes

Recipes list:

``` text
RECIPES

[ Search recipes... ]

SORT: Most Used ▾

Homemade Chili
142 kcal / 100 g

Homemade Bread
247 kcal / 100 g

Vegetable Soup
Incomplete

[ + NEW RECIPE ]
```

Incomplete Recipes may be saved but cannot be logged.

A Recipe contains name, weighted ingredients, finished cooked weight,
calculated nutrition, and optional variations.

``` text
HOMEMADE CHILI

INGREDIENTS

80/20 Ground Beef       500 g
Canned Tomatoes         800 g
Black Beans             400 g
Onion                   150 g

[ + ADD INGREDIENT ]
```

Adding an ingredient reuses local Food search. Create Custom Food and
Search USDA remain available inside this workflow so recipe creation is
never abandoned just to create an ingredient.

## Finished weight

A loggable Recipe requires the weight of the complete finished cooked
recipe:

``` text
FINISHED WEIGHT
[ 1,850 ] g
```

Portion nutrition:

**portion weight ÷ finished recipe weight × exact total recipe
nutrition**

A Recipe may be saved without finished weight, but remains Incomplete.

## Completeness

A Recipe is loggable only with:

-   non-empty name;
-   at least one ingredient;
-   valid positive ingredient weights;
-   complete nutrition for every ingredient;
-   valid positive finished weight.

Only incomplete Recipes need a visible status.

## Editing

Allow rename, add/remove/replace ingredients, change ingredient weights,
change finished weight. Recalculate automatically. Changes affect future
logs only.

------------------------------------------------------------------------

# 9. Recipe Variations

A Variation is a child of a base Recipe, not another top-level Recipe.

``` text
HOMEMADE CHILI

BASE RECIPE
...

VARIATIONS

Pinto Beans
Lean Beef
No Beans

[ + NEW VARIATION ]
```

Variations inherit the base and store only differences:

-   replace ingredient;
-   remove ingredient;
-   add ingredient;
-   change ingredient weight.

``` text
PINTO BEANS VARIATION

CHANGES FROM BASE

Black Beans      400 g
       ↓
Pinto Beans      400 g

Finished Weight
[ 1,920 ] g
```

Every Variation has its own finished weight.

Resolved Variation = base ingredients + overrides.

## Logging

Search returns one `Homemade Chili` result. If there are no variations,
go directly to grams. If variations exist:

``` text
Which version?

Base Recipe
Pinto Beans
Lean Beef
No Beans
```

Do not ask when only the base exists.

------------------------------------------------------------------------

# 10. Restaurant / Quick Entry

Quick Entry never becomes a reusable Food.

``` text
QUICK ENTRY

Name
[ Burger and fries ]

Calories
[ 1,150 ] kcal

› Add nutrition details

[ ADD TO LOG ]
```

Name and calories required. Optional: protein, total fat, carbohydrates,
sodium, cholesterol.

Unknown values are `null`/unknown, never zero.

If the day contains incomplete Quick Entry nutrition, Log may show one
subtle:

**ⓘ Partial nutrition data today**

Quick Entry may have an **Estimated** flag.

If an estimate is a range, always use the higher value.

------------------------------------------------------------------------

# 11. Nutrition Math

## Precision

Retain full source and intermediate precision. Never repeatedly round
intermediate calculations.

## Final rounding

Final logged nutrition values are whole numbers and always round upward:

``` text
100.00 → 100
100.01 → 101
100.50 → 101
100.99 → 101
```

The official snapshot on each logged entry is the upward-rounded final
result.

Daily totals are the sum of official visible entry snapshots so that
visible rows add exactly to the visible daily total.

## Food scaling

**requested weight / reference weight × source nutrient value**

When a standard portion is used, first calculate:

**portion count × standard portion weight = requested weight in grams**

Grams remain the canonical stored and calculation unit.

## Recipe scaling

1.  Scale each ingredient exactly.
2.  Sum exact ingredient nutrition.
3.  Calculate exact portion from finished recipe weight.
4.  Round upward only at the final logged portion.

Apply the same method after resolving a Recipe Variation.

------------------------------------------------------------------------

# 12. History & Retention

Every logged Food/Recipe/Variation/Quick Entry stores the nutrition used
at that moment. Later source edits never rewrite history.

Detailed log entries are retained for **three months**. During that
period they may be viewed, edited, and deleted.

After the retention cutoff they are hard-deleted automatically.

Daily nutrition summaries are retained indefinitely and store date, all
six nutrition values, and whether the day had partial nutrition.

While detailed entries exist, every add/edit/delete recalculates the
affected daily summary.

Before purging old detail, verify the permanent daily summary exists and
is current.

------------------------------------------------------------------------

# 13. Goals

Goals are effective-dated:

-   calorie target;
-   protein minimum;
-   calorie tolerance percentage;
-   effective date.

Historical days use the most recent goal whose effective date is on or
before that day.

Normal Settings changes take effect **today**. Do not ask for an
effective date.

If goals change multiple times in one day, the most recent values
replace that day's record.

Previous days remain unchanged. Future days use the newest goal until
changed again.

The app never automatically lowers the calorie goal.

------------------------------------------------------------------------

# 14. Progress & Weight

Progress answers: **What is my weight doing, and how does that relate to
my calorie intake?**

Top:

``` text
Current Weight       286.4 lb
Starting Weight      305.0 lb
Total Change         -18.6 lb
```

Modes: **Weight \| Calories \| Both**

Ranges: **1M \| 3M \| 6M \| 1Y \| All**

Default: Weight, 3M.

## Weight graph

Every actual weigh-in is a dot connected by a thin line. Never fabricate
measurements for missing days.

## Calorie graph

Use permanent daily summaries. Show the calorie target and tolerance
band that actually applied historically. Goal changes should visibly
step/change over time.

## Combined graph

Overlay weight and calories on one timeline with separate Y axes.

Show the historical calorie target tolerance band against the calorie
axis so weight changes can be compared with whether calorie intake was
inside or outside the applicable range.

-   Left: weight
-   Right: calories
-   Weight: purple
-   Calories: orange
-   No blue

Must remain legible on iPhone 11.

## Weight logging

``` text
LOG WEIGHT

Weight
[ 286.4 ] lb

Date
[ August 21, 2026 ]

[ SAVE ]
```

Hard-code pounds for V1. Display one decimal. Default date today. One
weigh-in per calendar date; a new value for the same date
updates/replaces it.

Weight history is permanent. Erroneous weigh-ins may be hard-deleted.

------------------------------------------------------------------------

# 15. Settings

Keep Settings small:

``` text
SETTINGS

GOALS

Daily Calories
2,000 kcal                 ›

Protein Minimum
160 g                      ›

Calorie Target Range
±10%                       ›

PREFERENCES

Measurements
Grams                       ›

DATA

Backup
Create or restore          ›

Deleted Items              ›

Reset Data                 ›

ABOUT

App Version
1.0.0
```

Reset Data permanently erases all user data while preserving the app's
database structure. Require explicit confirmation that clearly states
the action cannot be undone before deleting anything.

Do not add theme, meal settings, notifications, account,
language, dashboard, or other preference clutter.

## Goal editors

Calories and protein show: **Changes take effect today. Previous days
are not changed.**

Tolerance:

``` text
CALORIE TARGET RANGE

[ − ]      ± 15%      [ + ]

Current calorie goal
1,600 kcal

Your target range
1,360 – 1,840 kcal

[ SAVE ]
```

Use one-percentage-point increments.

## Deleted Items

Allow Restore and Permanently Delete for soft-deleted Foods/Recipes.
Permanent deletion requires confirmation and referential integrity.

------------------------------------------------------------------------

# 16. First Launch

No onboarding tour.

``` text
WELCOME

Daily Calorie Goal
[ 2,000 ]

Protein Minimum
[ 160 ] g

Calorie Range
[ ±10% ]

[ START ]

Restore Existing Backup
```

After Start, open Log.

------------------------------------------------------------------------

# 17. Backup & Restore

SQLite on the iPhone is the working source of truth. Backup and restore
use manually saved portable JSON files, not cloud sync.

Use a versioned portable JSON backup, not a raw SQLite copy.

Concept:

``` json
{
  "format": "personal-nutrition-tracker",
  "version": 4,
  "createdAt": "2026-08-21T17:00:00-07:00",
  "data": {
    "foods": [],
    "foodPortions": [],
    "recipes": [],
    "recipeIngredients": [],
    "recipeVariations": [],
    "variationOverrides": [],
    "dailyNutrition": [],
    "foodLogs": [],
    "weighIns": [],
    "goals": [],
    "logDayCompletions": [],
    "preferences": {
      "measurementSystem": "grams"
    }
  }
}
```

The `personal-nutrition-tracker` format identifier is retained for
backward compatibility with backups created before the Autofutter rename.
Backup version 4 includes cached USDA portion conversions. Backup version
3 includes the measurement preference. Version 2 includes optional Food
standard portions. Version 1 backups remain restorable and are treated as
having no standard portions. Versions 1 and 2 default to `Grams` when
restored; versions 1 through 3 default to no cached USDA conversions.
The format must be versioned, schema-validatable, portable,
human-inspectable where practical, and complete.

## Create backup file

SQLite mutations commit immediately. Backup is a separate, manual action
and must never block successful logging.

From Settings → Backup:

1.  create a complete versioned JSON document from a consistent database
    snapshot;
2.  validate the generated document;
3.  open the supported iOS share sheet;
4.  allow the user to save the file to any available Files location.

Do not require an app-owned iCloud container or paid Apple Developer
capabilities. The user may choose iCloud Drive, On My iPhone, or another
Files provider when available. Do not claim that a backup was saved merely
because the share sheet was opened.

## Restore

1.  Select backup.
2.  Parse.
3.  Validate format/version/schema.
4.  Show summary.
5.  Require explicit confirmation.
6.  Restore transactionally.
7.  Verify integrity.
8.  Commit only on success.

Failure must roll back and preserve current data.

------------------------------------------------------------------------

# 18. Technical Stack

Use:

-   React Native
-   Expo
-   TypeScript
-   iOS only
-   SQLite

At finalization, Expo SDK 57 targets React Native 0.86 and iOS 16.4+.
Use the current stable compatible SDK at implementation start; do not
casually upgrade major versions mid-build.

Use Expo development builds for native testing.

## Device compatibility

Support **iPhone 11 and newer**. iPhone 11 is the baseline for layout,
performance, and compatibility.

Use responsive layout and safe areas. No fixed-device layout logic,
Dynamic Island dependency, or newer-iPhone-only hardware dependency.

Simulator QA includes an iPhone 11 baseline and at least one
representative newer iPhone.

------------------------------------------------------------------------

# 19. Application Architecture

Use clear layers:

``` text
UI / Routes / Components
          ↓
Application Services
          ↓
Repositories
          ↓
SQLite
```

External adapters:

-   USDA
-   Backup storage

Rules:

-   React components contain no SQL.
-   React components contain no core nutrition math.
-   Repositories contain no UI behavior.
-   Raw USDA response shapes do not leak through the app.
-   Backup implementation details do not leak through the app.

## Navigation

Use Expo Router file-based routing.

Prefer the stable JavaScript tab mechanism. Do not depend on
experimental/alpha native-tabs APIs merely for appearance.

Conceptual routes:

``` text
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    foods.tsx
    recipes.tsx
    progress.tsx
  log/
    add.tsx
    entry/[id].tsx
    quick-entry.tsx
  foods/
    new.tsx
    [id].tsx
    usda.tsx
  recipes/
    new.tsx
    [id].tsx
    [id]/variation/new.tsx
    [id]/variation/[variationId].tsx
  weight/
    new.tsx
    history.tsx
    [id].tsx
  settings/
    index.tsx
    calories.tsx
    protein.tsx
    tolerance.tsx
    backup.tsx
    deleted.tsx
```

Keep route files thin.

## State

Do not add Redux. Do not add a global state library without a
demonstrated need.

-   SQLite = persistent truth
-   React state = temporary UI/form state
-   Router = navigation state

Avoid duplicate persistent truth in JavaScript memory.

------------------------------------------------------------------------

# 20. SQLite & Migrations

Use `expo-sqlite`.

At initialization:

``` sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

Use bound parameters/prepared statements for user-derived values. Use
transactions for atomic multi-record operations.

Use stable UUID strings for persistent IDs.

Use ordered migrations, for example:

``` text
src/data/database/migrations/
  001_initial_schema.ts
  002_...
```

Track migration version. Never rewrite an already-released migration;
add another.

------------------------------------------------------------------------

# 21. Suggested Schema

## foods

``` text
id TEXT PRIMARY KEY
name TEXT NOT NULL
reference_weight_g REAL NOT NULL
calories REAL NOT NULL
protein_g REAL NOT NULL
fat_g REAL NOT NULL
carbs_g REAL NOT NULL
sodium_mg REAL NOT NULL
cholesterol_mg REAL NOT NULL
source_type TEXT NOT NULL
source_id TEXT NULL
use_count INTEGER NOT NULL DEFAULT 0
last_used_at TEXT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT NULL
standard_portion_label TEXT NULL
standard_portion_weight_g REAL NULL
```

## food_portion_conversions

``` text
food_id TEXT NOT NULL
sort_order INTEGER NOT NULL
label TEXT NOT NULL
amount REAL NOT NULL
gram_weight_g REAL NOT NULL
volume_unit TEXT NULL
source_type TEXT NOT NULL
source_id TEXT NULL
created_at TEXT NOT NULL
PRIMARY KEY (food_id, sort_order)
FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
```

## recipes

``` text
id TEXT PRIMARY KEY
name TEXT NOT NULL
finished_weight_g REAL NULL
use_count INTEGER NOT NULL DEFAULT 0
last_used_at TEXT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT NULL
```

## app_preferences

``` text
id INTEGER PRIMARY KEY CHECK (id = 1)
measurement_system TEXT NOT NULL CHECK (measurement_system IN ('grams', 'freedom'))
```

## recipe_ingredients

``` text
id TEXT PRIMARY KEY
recipe_id TEXT NOT NULL
food_id TEXT NOT NULL
weight_g REAL NOT NULL
sort_order INTEGER NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

## recipe_variations

``` text
id TEXT PRIMARY KEY
recipe_id TEXT NOT NULL
name TEXT NOT NULL
finished_weight_g REAL NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
deleted_at TEXT NULL
```

## recipe_variation_overrides

``` text
id TEXT PRIMARY KEY
variation_id TEXT NOT NULL
action TEXT NOT NULL
base_recipe_ingredient_id TEXT NULL
food_id TEXT NULL
weight_g REAL NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

Allowed actions: `replace`, `remove`, `add`, `change_weight`.

## food_log_entries

``` text
id TEXT PRIMARY KEY
log_date TEXT NOT NULL
logged_at TEXT NOT NULL
entry_type TEXT NOT NULL
source_food_id TEXT NULL
source_recipe_id TEXT NULL
source_variation_id TEXT NULL
display_name_snapshot TEXT NOT NULL
amount_g REAL NULL
calories INTEGER NOT NULL
protein_g INTEGER NULL
fat_g INTEGER NULL
carbs_g INTEGER NULL
sodium_mg INTEGER NULL
cholesterol_mg INTEGER NULL
is_estimated INTEGER NOT NULL DEFAULT 0
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

Entry types: `food`, `recipe`, `recipe_variation`, `quick`.

## daily_nutrition_summaries

``` text
date TEXT PRIMARY KEY
calories INTEGER NOT NULL
protein_g INTEGER NULL
fat_g INTEGER NULL
carbs_g INTEGER NULL
sodium_mg INTEGER NULL
cholesterol_mg INTEGER NULL
has_partial_nutrition INTEGER NOT NULL DEFAULT 0
updated_at TEXT NOT NULL
```

## nutrition_goals

``` text
id TEXT PRIMARY KEY
effective_date TEXT NOT NULL UNIQUE
calorie_target INTEGER NOT NULL
protein_minimum_g INTEGER NOT NULL
calorie_tolerance_percent INTEGER NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

## weigh_ins

``` text
id TEXT PRIMARY KEY
date TEXT NOT NULL UNIQUE
weight_lb REAL NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

Add appropriate foreign keys and indexes. Small schema refinements are
allowed when they improve integrity without changing documented
behavior; explain meaningful deviations.

------------------------------------------------------------------------

# 22. Repositories & Services

SQL belongs in repositories/database code.

Suggested repositories:

``` text
foodRepository
recipeRepository
foodLogRepository
dailySummaryRepository
goalRepository
weightRepository
```

Suggested application services:

``` text
foodLoggingService
recipeService
goalService
retentionService
backupService
usdaService
```

A logging service may load source data, resolve a variation, calculate
exact nutrition, round final snapshots, insert the entry, update usage
metadata, recalculate the daily summary, commit, then mark backup dirty.

------------------------------------------------------------------------

# 23. Pure Nutrition Domain

Keep math independent of React Native and SQLite.

Suggested:

``` text
src/domain/nutrition/
  nutritionCalculator.ts
  recipeCalculator.ts
  goalCalculator.ts
  calorieGaugeCalculator.ts
```

Representative pure functions:

``` text
scaleNutrition(...)
calculateRecipeNutrition(...)
calculateRecipePortion(...)
roundLoggedNutrition(...)
calculateCalorieRange(...)
calculateGaugeState(...)
```

The CalorieGauge component receives calculated gauge state. Do not bury
business thresholds inside SVG code.

------------------------------------------------------------------------

# 24. USDA Adapter

Isolate USDA:

``` text
src/services/usda/
  usdaClient.ts
  usdaMapper.ts
  usdaTypes.ts
```

Map the external response immediately into a small internal type. Do not
let raw USDA objects propagate.

Do not commit API keys. Do not create a backend solely to hide the USDA
key for this private client-only app.

------------------------------------------------------------------------

# 25. Forms, Dates, Validation

React Hook Form + Zod is preferred if compatible with the selected
current toolchain.

Avoid `any`.

For logical calendar days use local `YYYY-MM-DD` strings. Do not store a
day as UTC and later rediscover its date. Use timestamps only for actual
moments such as `created_at`, `updated_at`, and `logged_at`.

Reject at minimum empty required names, negative values, zero/negative
reference weights, zero/negative ingredient weights, zero/negative
finished weights, invalid goals/tolerance, invalid body weights, and
malformed numeric input.

Validation messages are concise.

------------------------------------------------------------------------

# 26. Retention Service

No server/background job system.

Run retention maintenance on app startup/foreground at most as
necessary, such as once per calendar day.

For expired detailed logs:

1.  verify/recalculate permanent daily summary;
2.  hard-delete detailed entries;
3.  preserve daily nutrition, goals, and weight.

------------------------------------------------------------------------

# 27. Visual Implementation

Light mode only. Centralize theme tokens.

Primary/accent colors: purple spectrum. **No blue accent.**

Semantic calorie colors: green, orange, red.

Use clean sans-serif typography and familiar icons. Avoid unnecessary
cards, gradients, illustrations, and dashboard clutter.

## Gauge

Use an Expo-compatible SVG solution such as `react-native-svg`. The
gauge needs exact arc geometry and should not use the general chart
library.

## Charts

Keep chart-library usage behind app-owned `WeightChart`, `CalorieChart`,
and `CombinedChart` components.

Choose one actively maintained Expo-compatible library that supports
required line/point rendering, historical bands, combined timeline/dual
axes, and iPhone 11 performance. Do not spread library-specific APIs
throughout the app.

------------------------------------------------------------------------

# 28. Suggested Project Structure

``` text
app/
  # route composition only

src/
  components/
    common/
    food/
    recipes/
    nutrition/
    charts/

  domain/
    nutrition/
    recipes/
    goals/

  data/
    database/
      database.ts
      migrations/
    repositories/

  services/
    logging/
    recipes/
    retention/
    backup/
    usda/

  schemas/
    food.ts
    recipe.ts
    goals.ts
    backup.ts

  hooks/

  theme/
    colors.ts
    spacing.ts
    typography.ts

  types/
  utils/

tests/
  domain/
  repositories/
  services/
```

Do not over-componentize trivial markup.

------------------------------------------------------------------------

# 29. Testing

Use testing tools appropriate to the current Expo/React Native
toolchain; Jest and React Native Testing Library are preferred where
compatible.

Most tests should target pure logic and persistence rather than
pixel-level UI.

## Required calculation tests

-   Reference-weight scaling
-   Arbitrary portion scaling
-   All six nutrients
-   Decimal source values
-   Upward final rounding
-   No repeated intermediate rounding
-   Recipe totals
-   Finished-weight calculations
-   Recipe portions
-   Variation inheritance and every override action
-   Goal/tolerance boundaries
-   Gauge states

Use awkward values such as 33.333 g, 2.5 g fat, 187 g portions, and
1,653 g finished recipes.

## Required workflow/persistence tests

-   Food → Log → Daily Summary
-   Recipe → Portion → Log → Daily Summary
-   Variation → Resolve → Portion → Log
-   Editing Food does not alter historical Log
-   Editing Recipe does not alter historical Log
-   Same-day goal changes overwrite that day's goal
-   Prior days retain prior goals
-   Quick Entry with unknown nutrients sets partial state
-   Soft delete and restore
-   Three-month purge preserves summary
-   Backup serialization and validation
-   Corrupt/incompatible backup rejection
-   Failed restore preserves current database
-   Successful restore is transactional

------------------------------------------------------------------------

# 30. Performance

The app should feel immediate on an iPhone 11, especially opening Log,
searching local Foods, opening Add Food, entering grams, saving,
navigating dates, editing Recipes, and rendering ordinary personal-scale
progress data.

------------------------------------------------------------------------

# 31. Codex Rules

1.  Read this README completely before implementation.
2.  Treat it as the authoritative product specification.
3.  TypeScript strict mode is required.
4.  Avoid `any`.
5.  Business logic does not live in React components.
6.  SQL stays in repository/database code.
7.  Nutrition math stays in pure domain functions.
8.  Use transactions where consistency spans multiple records.
9.  Use bound SQL parameters for user-derived values.
10. Never rewrite an already-released migration.
11. Do not add dependencies when Expo/current project functionality
    adequately solves the requirement.
12. Do not add unspecified product features.
13. Do not build Android product functionality.
14. Do not add auth, remote database storage, telemetry, analytics,
    cloud sync, or backend infrastructure.
15. Do not change nutrition rules.
16. Preserve the low-friction workflows.
17. Do not add unnecessary screens, fields, settings, or confirmations.
18. Do not commit secrets, API keys, credentials, signing material, or
    local environment files.
19. Keep commits logically organized.
20. Write automated tests for calculation and persistence changes before
    considering the feature complete.
21. Prefer explicit maintainable code over clever abstractions.
22. If a platform limitation blocks a requirement, document it and use
    the smallest reasonable alternative rather than silently redesigning
    the feature.

------------------------------------------------------------------------

# 32. Implementation Phases

## Phase 1 --- Foundation

Expo/TypeScript project, iOS configuration, Expo Router, four tabs,
theme, SQLite, migrations, repositories, test infrastructure, iPhone 11
baseline.

Exit: app boots, tabs navigate, SQLite persists, migrations/tests work.

## Phase 2 --- Nutrition Domain

Food scaling, rounding, Recipe math, finished weight, Variation
resolution, goals/tolerance, gauge state.

Exit: comprehensive domain tests; no nutrition math in UI.

## Phase 3 --- Core Logging

Log screen, date navigation, gauge, protein, reference nutrition, Add
Food, local search, Recent, amount entry, daily summaries, log
edit/delete.

Exit: daily logging works end-to-end.

## Phase 4 --- Foods & USDA

Foods list/search/sort, Create/Edit, soft delete/restore, USDA
search/mapping/review, Save & Use.

Exit: reusable food workflows are complete.

## Phase 5 --- Recipes & Variations

Recipe CRUD, ingredients, incomplete state, finished weight, Variations,
overrides, variation logging.

Exit: homemade Recipe and substitution Variation can be accurately
logged by grams.

## Phase 6 --- Quick Entry & Goals

Restaurant Quick Entry, partial nutrition, estimated flag, Settings,
effective-dated calories/protein/tolerance.

Exit: today's goal changes do not rewrite prior days.

## Phase 7 --- Progress

Weigh-in CRUD, Weight/Calories/Both charts, historical target bands,
date ranges.

Exit: charts are legible and performant on iPhone 11.

## Phase 8 --- Retention & Backup

Three-month cleanup, summary preservation, portable JSON backup file,
restore validation and transaction safety.

Exit: retention and restore are safe; JSON export and import behavior is
proven.

## Phase 9 --- QA

Test iPhone 11 simulator, newer iPhone simulator, real device, safe
areas, keyboards, long names, empty states, local use without internet,
USDA offline behavior, backup failures, tests, secret scanning, and
visual consistency.

------------------------------------------------------------------------

# 33. Definition of Done

V1 is done when the user can:

1.  Open directly to today's Log.
2.  See calorie status, protein progress, and reference nutrition.
3.  Add a known Food in only a few actions.
4.  Create a reusable Food without manual normalization math.
5.  Import and edit USDA data.
6.  Create a weighted homemade Recipe.
7.  Enter its finished weight.
8.  Create a lightweight Variation for ingredient substitutions.
9.  Log a Recipe/Variation by grams eaten.
10. Make a restaurant/estimated Quick Entry.
11. Change calorie/protein/tolerance goals without rewriting history.
12. Log body weight.
13. Compare weight and calorie trends.
14. Retain permanent daily nutrition and weight history.
15. Automatically purge detailed food history after three months.
16. Back up and restore data safely.
17. Run acceptably on iPhone 11 and newer.

------------------------------------------------------------------------

# Final Product Principle

At home:

> **I weighed my food. Tell me what I ate.**

For recipes:

> **I know what went into the pot and what the finished pot weighs. Tell
> me what is in my portion.**

For progress:

> **Show me what my calorie intake and weight have actually been
> doing.**

For the app:

> **Record it. Calculate it. Get out of the way.**

**The application does not judge.**
