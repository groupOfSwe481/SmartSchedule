import { Course } from "../db/models/Course.js";
import { Level } from "../db/models/Level.js";
import { Rule } from "../db/models/Rule.js";
// Using the Schedule model (which includes status: 'Draft')
import { Schedule, MasterSchedule } from "../db/models/Schedule.js";
import { Student } from "../db/models/Student.js";
import { Section } from "../db/models/Section.js";
import { generateWithGemini } from "../gemini/geminiClient.js";

// --- NEW IMPORTS FOR VERSIONING ---
import { ScheduleHistory } from "../db/models/ScheduleHistory.js";
import * as jsondiffpatchLib from "jsondiffpatch";
const jsondiffpatch = (jsondiffpatchLib as any).create();
// ---

// =================================================================
// --- START: HELPER FUNCTIONS ---
// (These helpers are all correct)
// =================================================================

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

const normalizeAndExpandTimeSlot = (slotString) => {
  const colonIndex = slotString.indexOf(":");
  let relevantString = slotString.trim();
  if (colonIndex !== -1) {
    relevantString = slotString.substring(colonIndex + 1).trim();
  }
  const trimmed = relevantString;
  const dayMatch = daysOfWeek.find((day) => trimmed.startsWith(day));
  if (!dayMatch) {
    console.warn(
      `[HELPER normalize] Could not parse day from: "${slotString}" (Cleaned: "${trimmed}")`
    );
    return [slotString];
  }
  const timePart = trimmed.substring(dayMatch.length).trim();
  const timeMatch = timePart.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
  if (!timeMatch) {
    console.warn(
      `[HELPER normalize] Could not parse time range from: "${timePart}" (Original: "${slotString}")`
    );
    return [slotString];
  }
  let startHour = parseInt(timeMatch[1], 10);
  const endHour = parseInt(timeMatch[3], 10);
  const generatedSlots = [];
  for (let h = startHour; h < endHour; h++) {
    let displayHour = h;
    if (h > 12) {
      displayHour = h - 12;
    } else if (h === 0) {
      displayHour = 12;
    }
    const gridSlot = `${dayMatch} ${displayHour}:00-${displayHour}:50`;
    generatedSlots.push(gridSlot);
  }
  if (generatedSlots.length === 0) {
    if (timeMatch) {
      return [trimmed];
    }
    return [slotString];
  }
  return generatedSlots;
};

const getSectionsTimeSlots = (sections) => {
  const slots = new Set();
  for (const section of sections) {
    for (const timeSlot of section.time_Slot) {
      const expandedSlots = normalizeAndExpandTimeSlot(timeSlot);
      for (const slot of expandedSlots) {
        slots.add(slot);
      }
    }
  }
  return slots;
};

const checkCombinationForConflicts = (combination) => {
  const occupiedSlots = new Set();
  for (const section of combination) {
    for (const timeSlot of section.time_Slot) {
      const expandedSlots = normalizeAndExpandTimeSlot(timeSlot);
      for (const slot of expandedSlots) {
        if (occupiedSlots.has(slot)) {
          console.error(
            `[HELPER checkConflict] Conflict found for slot: ${slot}`
          );
          return true;
        }
        occupiedSlots.add(slot);
      }
    }
  }
  return false;
};

const findValidCombinations = (groupedSections) => {
  console.log("[HELPER findValidCombinations] Starting backtracking...");
  const allCombinations = [];
  const courseCodes = Object.keys(groupedSections);
  const backtrack = (courseIndex, currentCombination) => {
    if (courseIndex === courseCodes.length) {
      if (!checkCombinationForConflicts(currentCombination)) {
        allCombinations.push([...currentCombination]);
      }
      return;
    }
    const currentCourseCode = courseCodes[courseIndex];
    const sectionsForThisCourse = groupedSections[currentCourseCode];
    if (!sectionsForThisCourse || sectionsForThisCourse.length === 0) {
      console.warn(
        `[HELPER backtrack] ⚠️ No sections found for external course ${currentCourseCode}. Skipping.`
      );
      backtrack(courseIndex + 1, currentCombination);
      return;
    }
    for (const section of sectionsForThisCourse) {
      currentCombination.push(section);
      backtrack(courseIndex + 1, currentCombination);
      currentCombination.pop();
    }
  };
  backtrack(0, []);
  console.log(
    `[HELPER findValidCombinations] Found ${allCombinations.length} valid combinations.`
  );
  return allCombinations;
};

// --- Helpers for Irregular Student Check ---
const getOccupiedSlots = (grid, ignoreSet = new Set()) => {
  const slots = new Set();
  if (!grid) return slots;
  for (const day of Object.keys(grid)) {
    for (const time of Object.keys(grid[day])) {
      const entry = grid[day][time];
      const fullSlot = `${day} ${time}`;
      if (entry && !ignoreSet.has(fullSlot)) {
        slots.add(fullSlot);
      }
    }
  }
  return slots;
};

const hasConflict = (setA, setB) => {
  for (const item of setA) {
    if (setB.has(item)) {
      return true;
    }
  }
  return false;
};

// =================================================================
// --- END: HELPER FUNCTIONS ---
// =================================================================

// =================================================================
// --- MAIN FUNCTION 1: generateSchedule ---
// =================================================================
export const generateSchedule = async (levelNum: number) => {
  console.log(`\n======================================================`);
  console.log(`🚀 START: Generating schedules for Level ${levelNum}`);
  console.log(`======================================================`);

  // =================================================================
  // --- START: FIX (Loading Core Course Pattern) ---
  // =================================================================
  console.log(`1. Fetching data for Level ${levelNum}...`);

  // 1a. Fetch the Level document (populate 'has' *without* pattern first)
  const levelData = await Level.findOne({ level_num: levelNum }).populate(
    "has"
  );

  if (!levelData) {
    console.error(`❌ CRITICAL: Level ${levelNum} not found in database.`);
    throw new Error(`Level ${levelNum} not found in database`);
  }
  console.log(
    `   ✅ Found level data. Student count: ${levelData.student_count}`
  );

  // 1b. Fetch Elective Courses
  const electiveCourseIds = (levelData as any).elective_course_ids || [];
  const electiveCoursesRaw = await Course.find({
    _id: { $in: electiveCourseIds },
  })
    .select("+pattern")
    .populate({
      path: "prerequisites",
      select: "name code level",
      populate: { path: "level", select: "level_num" },
    });

  // 1c. Fetch Core Courses (This is the new, guaranteed fix)
  // FIX: Map the *populated* 'has' array back to just an array of IDs.
  const coreCourseIds = (levelData.has as any[]).map((course) => course._id);

  // Now this query will work correctly and select the pattern.
  const coreCoursesRaw = await Course.find({
    _id: { $in: coreCourseIds },
  })
    .select("+pattern") // This guarantees the pattern is loaded
    .populate({
      path: "prerequisites",
      select: "name code level",
      populate: { path: "level", select: "level_num" },
    });

  const allCoursesRaw = [...coreCoursesRaw, ...electiveCoursesRaw];
  // =================================================================
  // --- END: FIX ---
  // =================================================================

  // 2. Calculate Groups
  const numberOfGroups = Math.ceil(levelData.student_count / 25);
  console.info(`2. Calculated Number of Groups: ${numberOfGroups}`);

  const rules = await Rule.find({});
  console.log(`   Fetched ${rules.length} general rules.`);

  // 3. Map and Categorize ALL Courses
  console.log("3. Processing and validating all courses...");
  const validCourses = allCoursesRaw.filter((c) => c != null);
  const allCourses = validCourses.map((c: any) => ({
    _id: c._id.toString(),
    name: c.name,
    code: c.code,
    pattern: c.pattern, // Pattern data is now correctly loaded
    department: c.department,
    prerequisites:
      c.prerequisites
        ?.filter((p) => p?.level?.level_num != null)
        .map((p) => ({
          name: p.name,
          code: (p as any).code,
          levelNum: (p as any).level.level_num,
        })) || [],
  }));

  const externalCourses = allCourses.filter(
    (c) => c.department !== "Software Engineering"
  );
  const sweCourses = allCourses.filter(
    (c) => c.department === "Software Engineering"
  );
  const electiveSweIds = new Set(
    electiveCoursesRaw
      .filter((c) => c.department === "Software Engineering")
      .map((c) => c._id.toString())
  );
  const coreSweCourses = sweCourses.filter((c) => !electiveSweIds.has(c._id));
  const electiveSweCourses = sweCourses.filter((c) =>
    electiveSweIds.has(c._id)
  );
  console.info(`   -> ${coreSweCourses.length} Core SWE courses.`);
  console.info(`   -> ${electiveSweCourses.length} Elective SWE courses.`);
  console.info(`   -> ${externalCourses.length} Total External (P1) courses.`);

  // 4. Find All Valid P1 Combinations
  console.log("4. Fetching, grouping, and finding valid P1 combinations...");
  const allExternalSections = await Section.find({
    course: { $in: externalCourses.map((c) => c.code) },
  }).lean();
  const groupedExternalSections = {};
  externalCourses.forEach((c) => (groupedExternalSections[c.code] = []));
  allExternalSections.forEach((s) =>
    groupedExternalSections[s.course]?.push(s)
  );
  const allValidCombinations = findValidCombinations(groupedExternalSections);
  console.info(
    `   ✅ Found ${allValidCombinations.length} valid P1 combinations.`
  );
  if (allValidCombinations.length < numberOfGroups) {
    throw new Error(
      `Not enough valid external combinations: Need ${numberOfGroups}, found ${allValidCombinations.length}.`
    );
  }

  // 5. Prerequisite Logic (Setup)
  console.log("\n--- Prerequisite Chaining Logic (Setup) ---");
  const coursesWithPrereqs = sweCourses.filter(
    (c) => c.prerequisites.length > 0
  );
  const neededPrereqLevels = new Set(
    coursesWithPrereqs.flatMap((c) => c.prerequisites.map((p) => p.levelNum))
  );
  const masterSchedules = new Map();
  console.log(
    `5. Finding master schedules for levels: [${[...neededPrereqLevels]}]`
  );
  for (const level of neededPrereqLevels) {
    // FIX: Use Schedule model and find PUBLISHED
    const masterSchedule = await Schedule.findOne({
      level: level,
      status: "Published", // <-- We check against the PUBLISHED master schedule
    })
      .sort({ publishedAt: -1 }) // Get the latest published
      .lean();

    if (masterSchedule) masterSchedules.set(level, masterSchedule);
    else
      console.warn(
        `   ⚠️ No PUBLISHED master schedule found for Level ${level}.`
      );
  }

  const savedSchedules = [];
  const usedSlotsByCourse = new Map();
  console.log("\nInitializing empty map for used slots across groups.");

  // 6. Loop through each group (SEQUENTIALLY)
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING GENERATION LOOP FOR ${numberOfGroups} GROUPS`);
  console.log(`======================================================`);

  for (let i = 1; i <= numberOfGroups; i++) {
    const groupNum = i;
    const groupIndex = i - 1;
    console.group(
      `--- Generating schedule for Group ${groupNum} (Index ${groupIndex}) ---`
    );

    // 7. Assign P1 combination and Update Used Slots
    const groupExternalSections = allValidCombinations[groupIndex];
    const externalSlots = getSectionsTimeSlots(groupExternalSections);
    console.log(
      `   Assigned ${groupExternalSections.length} P1 sections for Group ${groupNum}.`
    );
    console.log(
      `   Updating used slots map with P1 courses for Group ${groupNum}...`
    );
    for (const section of groupExternalSections) {
      if (!usedSlotsByCourse.has(section.course)) {
        usedSlotsByCourse.set(section.course, new Set());
      }
      const slotSet = usedSlotsByCourse.get(section.course);
      for (const time of section.time_Slot) {
        const expandedSlots = normalizeAndExpandTimeSlot(time);
        for (const slot of expandedSlots) {
          slotSet.add(slot);
        }
      }
    }
    console.log(
      `   Total P1 occupied 50-min slots for Group ${groupNum}:`,
      externalSlots
    );

    // 8. Determine P2 and P3 lists
    console.log(
      `   Finding P2 (Prerequisite) & P3 (Flexible) slots for Group ${groupNum}...`
    );
    let finalFixedSlots = [];
    let groupFixedSweCodes = new Set();

    for (const course of coursesWithPrereqs) {
      const prereqIndex = (groupNum - 1) % course.prerequisites.length;
      const chosenPrereq = course.prerequisites[prereqIndex];
      const prereqCode = chosenPrereq.code;
      const prereqLevelNum = chosenPrereq.levelNum;

      console.log(
        `   -> Mapping ${course.code}: Using prereq #${prereqIndex} (${prereqCode} from L${prereqLevelNum})`
      );

      const masterSchedule = masterSchedules.get(prereqLevelNum);
      if (masterSchedule) {
        let fixedTimes = [];
        for (const [day, slots] of Object.entries(masterSchedule.grid)) {
          for (const [time, courseInGrid] of Object.entries(slots as object)) {
            if (
              courseInGrid &&
              (courseInGrid as string).startsWith(prereqCode)
            ) {
              fixedTimes.push({ slot: `${day} ${time}`, name: courseInGrid });
            }
          }
        }
        console.log(
          `       -> Found ${fixedTimes.length} ideal P2 slots from L${prereqLevelNum} grid:`,
          fixedTimes
        );

        if (fixedTimes.length > 0) {
          let hasConflictP1 = false;
          let hasConflictP2 = false;
          let hasConflictAcrossGroups = false;
          const usedTimesForThisCourse = usedSlotsByCourse.get(course.code);
          const currentP2FixedSlots = finalFixedSlots.flatMap((c) =>
            c.times.map((t) => t.slot)
          );

          for (const timeObj of fixedTimes) {
            const { slot, name } = timeObj;

            if (externalSlots.has(slot)) {
              console.warn(
                `       -> P1 CONFLICT: Ideal slot "${slot}" for ${course.code} (from ${name}) is taken by P1.`
              );
              hasConflictP1 = true;
              break;
            }
            if (currentP2FixedSlots.includes(slot)) {
              console.warn(
                ` 💥     -> P2-vs-P2 CONFLICT: Ideal slot "${slot}" for ${course.code} (from ${name}) is ALREADY taken by another P2 course.`
              );
              hasConflictP2 = true;
              break;
            }
            if (usedTimesForThisCourse?.has(slot)) {
              console.warn(
                `       -> ACROSS-GROUP CONFLICT: Ideal slot "${slot}" for ${course.code} was used in a previous group.`
              );
              hasConflictAcrossGroups = true;
            }
          }

          if (hasConflictP1 || hasConflictP2) {
            console.warn(
              `       -> RESULT: ${course.code} conflicts with ${
                hasConflictP1 ? "P1 (External)" : "another P2 (Prerequisite)"
              }. Releasing to P3 (flexible scheduling).`
            );
          } else {
            console.log(
              `       -> RESULT: SUCCESS. Fixing ${course.code} to ${fixedTimes.length} P2 slots.` +
                (hasConflictAcrossGroups
                  ? " (Note: Overlaps with previous group's usage)"
                  : "")
            );
            finalFixedSlots.push({
              courseName: course.name,
              courseCode: course.code,
              times: fixedTimes,
            });
            groupFixedSweCodes.add(course.code);
          }
        } else {
          console.warn(
            `       -> INFO: Prereq ${prereqCode} not found in master grid. Releasing ${course.code} to P3.`
          );
        }
      } else {
        console.warn(
          `       -> INFO: Cannot map ${course.code} (master schedule L${prereqLevelNum} missing). Releasing to P3.`
        );
      }
    }

    // Build separate P3 lists
    let groupFlexibleCoreSwe = [];
    coreSweCourses.forEach(
      (c) => !groupFixedSweCodes.has(c.code) && groupFlexibleCoreSwe.push(c)
    );
    let groupFlexibleElectiveSwe = [];
    electiveSweCourses.forEach(
      (c) => !groupFixedSweCodes.has(c.code) && groupFlexibleElectiveSwe.push(c)
    );

    console.info(
      `   Final P2 (Fixed SWE) Courses: ${finalFixedSlots.length}`,
      finalFixedSlots.map((c) => c.courseCode)
    );
    console.info(
      `   Final P3 (Flexible Core SWE): ${groupFlexibleCoreSwe.length}`,
      groupFlexibleCoreSwe.map((c) => c.code)
    );
    console.info(
      `   Final P3 (Flexible Elective SWE): ${groupFlexibleElectiveSwe.length}`,
      groupFlexibleElectiveSwe.map((c) => c.code)
    );

    // Prepare Forbidden Slots for Prompt
    let forbiddenSlotsPrompt = [];
    if (i > 1) {
      console.log(
        "   Calculating forbidden slots for P3 courses based on previous groups..."
      );
      const allFlexibleP3 = [
        ...groupFlexibleCoreSwe,
        ...groupFlexibleElectiveSwe,
      ];
      for (const course of allFlexibleP3) {
        const courseCode = course.code;
        const forbiddenTimes = usedSlotsByCourse.get(courseCode);
        if (forbiddenTimes && forbiddenTimes.size > 0) {
          console.log(
            `       -> Found forbidden slots for P3 course ${courseCode}:`,
            forbiddenTimes
          );
          forbiddenSlotsPrompt.push({
            courseCode: courseCode,
            courseName: course.name,
            times: [...forbiddenTimes],
          });
        }
      }
      console.log(
        `   Prepared forbidden slots list for ${forbiddenSlotsPrompt.length} P3 courses.`
      );
    }

    // 9. Build the Pre-filled Grid for the prompt
    console.log("   9. Building pre-filled grid for AI prompt...");
    const preFilledGrid = {};
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const gridSlots = [
      "8:00-8:50",
      "9:00-9:50",
      "10:00-10:50",
      "11:00-11:50",
      "12:00-12:50",
      "1:00-1:50",
      "2:00-2:50",
    ];

    days.forEach((day) => {
      preFilledGrid[day] = {};
      gridSlots.forEach((slot) => {
        preFilledGrid[day][slot] = "";
      });
    });

    groupExternalSections.forEach((section) => {
      for (const time of section.time_Slot) {
        const parts = time.split(":");
        let type = "Lec";
        if (parts.length > 1) {
          const typeStr = parts[0].toLowerCase().trim();
          if (typeStr === "lab") type = "L";
          if (typeStr === "tutorial") type = "T";
        }

        const expandedSlots = normalizeAndExpandTimeSlot(time);
        for (const slot of expandedSlots) {
          const [day, ...timeParts] = slot.split(" ");
          const timeRange = timeParts.join(" ");
          if (
            preFilledGrid[day] &&
            preFilledGrid[day][timeRange] !== undefined
          ) {
            preFilledGrid[day][timeRange] = `${section.course} (${type})`;
          } else {
            console.warn(
              `[Grid Build] Invalid P1 slot: ${day} ${timeRange} from "${slot}"`
            );
          }
        }
      }
    });

    finalFixedSlots.forEach((course) => {
      for (const timeObj of course.times) {
        const { slot, name } = timeObj;

        const typeMatch = name.match(/\((Lec|T|L)\)/);
        const typeSuffix = typeMatch ? typeMatch[0] : "(Lec)";

        const targetCourseName = `${course.courseCode} ${typeSuffix}`;

        const [day, ...timeParts] = slot.split(" ");
        const timeRange = timeParts.join(" ");
        if (preFilledGrid[day] && preFilledGrid[day][timeRange] !== undefined) {
          preFilledGrid[day][timeRange] = targetCourseName;
        } else {
          console.warn(
            `[Grid Build] Invalid P2 slot: ${day} ${timeRange} from "${slot}"`
          );
        }
      }
    });

    let preFilledPrompt =
      "The schedule grid is partially filled. Here are the slots that are ALREADY TAKEN:\n";
    days.forEach((day) => {
      let dayHasEntry = false;
      let dayString = `\nOn ${day}:\n`;
      gridSlots.forEach((slot) => {
        const entry = preFilledGrid[day][slot];
        if (entry) {
          dayString += `  - ${slot}: ${entry}\n`;
          dayHasEntry = true;
        }
      });
      if (dayHasEntry) {
        preFilledPrompt += dayString;
      }
    });

    // 9. Construct and Send Prompt
    const prompt = `
You are an academic schedule generator for King Saud University (Software Engineering Department).
Your task is to fill in the EMPTY slots of a schedule for Level ${levelNum}, Group ${groupNum}.

The schedule grid uses 50-minute slots:
"8:00-8:50", "9:00-9:50", "10:00-10:50", "11:00-11:50", "12:00-12:50", "1:00-1:50", "2:00-2:50"
The week starts from Sunday.

---

📘 PRE-FILLED SLOTS (FIXED)
${preFilledPrompt}
These slots CANNOT be changed or overwritten. You must schedule around them.

---

🚫 FORBIDDEN SLOTS (Used by Other Groups)
For the P3 courses listed below, DO NOT schedule them in these specific 50-minute time slots as they are already occupied by the same course in other groups.
${
  forbiddenSlotsPrompt.length > 0
    ? forbiddenSlotsPrompt
        .map(
          (f) =>
            `\n- Course: ${f.courseName} (${
              f.courseCode
            })\n  Forbidden Times:\n${f.times
              .map((ts) => `    - ${ts}`)
              .join("\n")}`
        )
        .join("\n")
    : "None"
}
---

🧩 P3 COURSES TO SCHEDULE (Flexible)
Your ONLY job is to schedule ALL of the following courses into the available EMPTY slots.
Follow the pattern (e.g., "2 Lec(s), 1 Lab(s)") for each.
${
  groupFlexibleCoreSwe.length > 0
    ? groupFlexibleCoreSwe
        .map((c) => {
          let patternString = "N/A - ERROR: Pattern missing";
          if (c.pattern) {
            const parts = [];
            if (c.pattern.lecture_hours > 0) {
              parts.push(`${c.pattern.lecture_hours} Lec(s)`);
            }
            if (c.pattern.lab_hours > 0) {
              parts.push(`${c.pattern.lab_hours} Lab(s)`);
            }
            if (c.pattern.tutorial_hours > 0) {
              parts.push(`${c.pattern.tutorial_hours} Tut(s)`);
            }
            patternString = parts.join(", ");
          }
          if (patternString.length === 0) patternString = "N/A - CHECK DB";
          return `- ${c.name} (${c.code}), Pattern: ${patternString}`;
        })
        .join("\n")
    : "None"
}
${
  groupFlexibleElectiveSwe.length > 0
    ? groupFlexibleElectiveSwe
        .map((c) => {
          let patternString = "N/A - ERROR: Pattern missing";
          if (c.pattern) {
            const parts = [];
            if (c.pattern.lecture_hours > 0) {
              parts.push(`${c.pattern.lecture_hours} Lec(s)`);
            }
            if (c.pattern.lab_hours > 0) {
              parts.push(`${c.pattern.lab_hours} Lab(s)`);
            }
            if (c.pattern.tutorial_hours > 0) {
              parts.push(`${c.pattern.tutorial_hours} Tut(s)`);
            }
            patternString = parts.join(", ");
          }
          if (patternString.length === 0) patternString = "N/A - CHECK DB";
          return `- ${c.name} (${c.code}), Pattern: ${patternString}`;
        })
        .join("\n")
    : "None"
}

---

⚙️ Rules:
${
  rules.length > 0
    ? rules.map((r) => `- ${r.rule_description}`).join("\n")
    : "None"
}

---

⚠️ Constraints:
1.  **CRITICAL:** Do NOT change any of the "PRE-FILLED SLOTS".
2.  Schedule ALL "P3 COURSES" into the remaining EMPTY slots.
3.  Strictly follow the 'Forbidden Time Slots' list for P3 courses.
4.  P3 courses must match their pattern.
5.  Mark slots with (L) for Lab, (T) for Tutorial, (Lec) for Lecture.

---

Output MUST be pure JSON representing the COMPLETE grid (including the P1/P2 slots you were given and the P3 slots you added).
[{"section": "Group ${groupNum}", "level": ${levelNum}, "grid": {"Sunday": {"8:00-8:50": "CourseCode (Type)", "9:00-9:50": "CourseCode (Type)", ...}, ...}}]
`;

    console.log(`🧠 Gemini Prompt Preview for Group ${groupNum} (snippet):`);
    console.log(prompt.substring(0, 500) + "\n... (rest of prompt) ...");

    console.log(`   ... Calling Gemini API for Group ${groupNum}...`);
    const parsedSchedule = await generateWithGemini(prompt);
    console.log(`   ✅ Received schedule from Gemini for Group ${groupNum}.`);

    // =================================================================
    // --- START: NEW SAVING LOGIC (Step 10) ---
    // =================================================================
    console.log(`   ... Saving schedule to database for Group ${groupNum}...`);

    const aiGrid = parsedSchedule[0]?.grid;
    if (!aiGrid) {
      console.warn(
        `   ⚠️ AI returned no grid for Group ${groupNum}. Skipping save.`
      );
      continue; // Skip to the next group in the 'for' loop
    }

    const groupSectionName = `Group ${groupNum}`;

    // 1. Find the existing draft for this group
    const existingDraft = await Schedule.findOne({
      level: levelNum,
      section: groupSectionName,
      status: "Draft",
    });

    let savedSchedule;
    const summary = `AI Generation (Run ${i})`;
    // ... inside generateSchedule loop ...

    if (existingDraft) {
      // --- UPDATE EXISTING DRAFT ---
      const oldGrid = JSON.parse(JSON.stringify(existingDraft.grid));
      const newGrid = aiGrid;
      const delta = jsondiffpatch.diff(oldGrid, newGrid);

      // ✅ FIX 1: Use history_version for the counter, not the public version
      const nextHistoryVersion = (existingDraft.history_version || 0) + 1;

      if (!delta) {
        console.log(`   ... No changes detected. Skipping version history.`);
        savedSchedule = existingDraft;
      } else {
        // 2. Update the main document
        existingDraft.grid = newGrid;

        // ✅ FIX 2: Update the history_version field
        existingDraft.history_version = nextHistoryVersion;

        // Optional: You might want to keep 'version' separate for "Published" releases only
        // existingDraft.version = ...

        savedSchedule = await existingDraft.save();

        // 3. Create a history record
        const historyRecord = new ScheduleHistory({
          schedule_id: existingDraft._id,

          // ✅ FIX 3: Use 'history_version' here (Matches your Schema)
          history_version: nextHistoryVersion,

          delta: delta,
          user_id: "AI_GENERATOR",
          summary: summary,
        });
        await historyRecord.save();
        console.log(
          `   ✅ Saved ${groupSectionName} as history v${nextHistoryVersion}.`
        );
      }
    } else {
      // --- CREATE NEW DRAFT ---
      const newSchedule = new Schedule({
        level: levelNum,
        section: groupSectionName,
        grid: aiGrid,
        status: "Draft",
        version: 1,

        // ✅ FIX 4: Initialize history_version
        history_version: 1,
      });
      savedSchedule = await newSchedule.save();

      // Also create an initial history record for v1
      const historyRecord = new ScheduleHistory({
        schedule_id: savedSchedule._id,

        // ✅ FIX 5: Use 'history_version' here
        history_version: 1,

        delta: { grid: [aiGrid] },
        user_id: "AI_GENERATOR",
        summary: `AI Initial Draft (v1)`,
      });
      await historyRecord.save();

      console.log(`   ✅ Saved new draft for ${groupSectionName} (v1).`);
    }

    savedSchedules.push(savedSchedule);

    // --- Update usedSlotsByCourse (this logic is unchanged) ---
    console.log(
      `   Updating used slots map with P2/P3 courses after Group ${groupNum}...`
    );
    const generatedGrid = savedSchedule.grid;
    if (generatedGrid) {
      // Add P2 slots
      console.log(
        `       -> Processing ${finalFixedSlots.length} P2 courses...`
      );
      for (const fixedCourse of finalFixedSlots) {
        if (!usedSlotsByCourse.has(fixedCourse.courseCode)) {
          usedSlotsByCourse.set(fixedCourse.courseCode, new Set());
        }
        const slotSet = usedSlotsByCourse.get(fixedCourse.courseCode);
        fixedCourse.times.forEach((timeObj) => slotSet.add(timeObj.slot));
      }

      // Add P3 slots
      console.log(`       -> Processing P3 courses from generated grid...`);
      let p3SlotsAdded = 0;
      const allP3Codes = new Set(
        [...groupFlexibleCoreSwe, ...groupFlexibleElectiveSwe].map(
          (c) => c.code
        )
      );
      for (const day of Object.keys(generatedGrid)) {
        for (const time of Object.keys(generatedGrid[day])) {
          const courseEntry = generatedGrid[day][time];
          if (courseEntry) {
            const courseCodeMatch = courseEntry.match(/^([A-Z]{3,4}\d{3})/);
            if (courseCodeMatch) {
              const courseCode = courseCodeMatch[1];
              if (allP3Codes.has(courseCode)) {
                if (!usedSlotsByCourse.has(courseCode)) {
                  usedSlotsByCourse.set(courseCode, new Set());
                }
                const slotSet = usedSlotsByCourse.get(courseCode);
                const fullSlot = `${day} ${time}`;
                if (!slotSet.has(fullSlot)) {
                  slotSet.add(fullSlot);
                  p3SlotsAdded++;
                }
              }
            }
          }
        }
      }
      console.log(
        `       -> Added ${p3SlotsAdded} unique P3 slots to the map.`
      );
    }
    // =================================================================
    // --- END: NEW SAVING LOGIC (Step 10) ---
    // =================================================================

    console.groupEnd();
  } // --- End Main Loop ---

  console.log(`\n======================================================`);
  console.log(`✅ All schedules successfully generated and saved.`);
  console.log(`======================================================`);

  console.log(
    "Final schedules from this run:",
    savedSchedules.map((s) => ({
      _id: s._id,
      level: s.level,
      section: s.section,
      version: s.version,
      status: s.status,
    }))
  );

  return { schedules: savedSchedules };
};

// =================================================================
// --- MAIN FUNCTION 2: getScheduleImpactReport ---
// =================================================================
export const getScheduleImpactReport = async (req, res) => {
  try {
    const { draftScheduleId } = req.body;

    // 1. Get the Draft Schedule we want to check
    const draft = await Schedule.findById(draftScheduleId);
    if (!draft) {
      return res.status(404).json({ error: "Draft schedule not found." });
    }
    const draftLevel = draft.level;
    const draftGrid = draft.grid;

    // 2. Get all Irregular Students for this draft's level
    const irregularStudents = await Student.find({
      level: draftLevel,
      irregulars: true,
    });

    if (!irregularStudents || irregularStudents.length === 0) {
      return res.status(200).json({
        message: "No irregular students found for this level.",
        impactedStudents: [],
      });
    }

    // 3. Get Course/Level data for ALL remaining courses
    const allRemainingCourseCodes = [
      ...new Set(
        irregularStudents.flatMap((s) => s.remaining_courses_from_past_levels)
      ),
    ];

    const remainingCoursesData = await Course.find({
      code: { $in: allRemainingCourseCodes },
    }).populate({ path: "level", select: "level_num" });

    const courseCodeToLevelMap = new Map();
    remainingCoursesData.forEach((c) => {
      courseCodeToLevelMap.set(c.code, (c.level as any).level_num);
    });

    // 4. Get all Master Schedules (for past levels)
    const neededPastLevels = [...new Set(courseCodeToLevelMap.values())];

    // FIX: Use Schedule model and filter for PUBLISHED
    const masterSchedules = await Schedule.find({
      level: { $in: neededPastLevels },
      status: "Published",
    });

    const masterSchedulesByLevel = {};
    masterSchedules.forEach((ms) => {
      if (
        !masterSchedulesByLevel[ms.level] ||
        (ms.publishedAt &&
          ms.publishedAt > masterSchedulesByLevel[ms.level].publishedAt)
      ) {
        masterSchedulesByLevel[ms.level] = ms;
      }
    });

    // 5. Get Prerequisite data for courses in the DRAFT
    const draftCourseCodes = new Set();
    for (const day of Object.keys(draftGrid)) {
      for (const time of Object.keys(draftGrid[day])) {
        const entry = draftGrid[day][time];
        if (entry) {
          const courseCodeMatch = entry.match(/^([A-Z]{3,4}\d{3})/);
          if (courseCodeMatch) draftCourseCodes.add(courseCodeMatch[1]);
        }
      }
    }
    const draftCourses = await Course.find({
      code: { $in: [...draftCourseCodes] },
    }).populate("prerequisites");

    const draftCoursePrereqs = new Map();
    draftCourses.forEach((c) => {
      draftCoursePrereqs.set(
        c.code,
        c.prerequisites.map((p: any) => p.code)
      );
    });

    // 6. Run the Conflict Check for EACH student
    const impactedStudents = [];

    for (const student of irregularStudents) {
      const remainingCourseCodes = new Set(
        student.remaining_courses_from_past_levels
      );
      let conflictingCourses = [];

      // --- Calculate 'Freed-Up' Slots for *this* student ---
      const freedUpSlots = new Set();
      for (const day of Object.keys(draftGrid)) {
        for (const time of Object.keys(draftGrid[day])) {
          const entry = draftGrid[day][time];
          if (entry) {
            const courseCodeMatch = entry.match(/^([A-Z]{3,4}\d{3})/);
            if (courseCodeMatch) {
              const courseCode = courseCodeMatch[1];
              const prereqs = draftCoursePrereqs.get(courseCode) || [];

              for (const prereqCode of prereqs) {
                if (remainingCourseCodes.has(prereqCode)) {
                  freedUpSlots.add(`${day} ${time}`);
                  break;
                }
              }
            }
          }
        }
      }

      const finalDraftSlots = getOccupiedSlots(draftGrid, freedUpSlots);

      // --- Check remaining courses against the final draft slots ---
      for (const courseCode of student.remaining_courses_from_past_levels) {
        const courseLevel = courseCodeToLevelMap.get(courseCode);
        if (!courseLevel) {
          console.warn(
            `Could not find level for remaining course ${courseCode}. Skipping.`
          );
          continue;
        }

        const masterSchedule = masterSchedulesByLevel[courseLevel];
        if (!masterSchedule) {
          console.warn(
            `No PUBLISHED master schedule found for L${courseLevel} to check ${courseCode}.`
          );
          continue;
        }

        const courseSlots = new Set();
        const masterGrid = masterSchedule.grid;
        for (const day of Object.keys(masterGrid)) {
          for (const time of Object.keys(masterGrid[day])) {
            if (
              masterGrid[day][time] &&
              masterGrid[day][time].startsWith(courseCode)
            ) {
              courseSlots.add(`${day} ${time}`);
            }
          }
        }

        // Check for conflicts
        if (hasConflict(courseSlots, finalDraftSlots)) {
          conflictingCourses.push({
            code: courseCode,
            level: courseLevel,
          });
        }
      } // end course loop

      if (conflictingCourses.length > 0) {
        impactedStudents.push({
          student_id: student.student_id,
          conflicts: conflictingCourses,
        });
      }
    } // end student loop

    // 7. Send the final report
    res.status(200).json({
      message: `Found ${impactedStudents.length} irregular students impacted by this draft.`,
      draftScheduleId: draftScheduleId,
      draftSection: draft.section,
      impactedStudents: impactedStudents,
    });
  } catch (error) {
    console.error("Error generating impact report:", error);
    res
      .status(500)
      .json({ error: "Server error during impact report generation." });
  }
};
// =================================================================
// --- RESTORE VERSION FUNCTION (Fixed for history_version) ---
// =================================================================
export const restoreScheduleVersion = async (req, res) => {
  try {
    // The frontend sends the version number as a parameter
    const { scheduleId, version } = req.params;
    const targetHistoryVersion = parseInt(version);

    // 1. Find the Current Schedule
    const currentSchedule = await Schedule.findById(scheduleId);
    if (!currentSchedule) {
      return res.status(404).json({ error: "Schedule not found." });
    }

    // 2. Find the specific History Record using 'history_version'
    // ✅ FIX: We search by 'history_version' (not 'version')
    const targetHistoryRecord = await ScheduleHistory.findOne({
      schedule_id: scheduleId,
      history_version: targetHistoryVersion,
    });

    if (!targetHistoryRecord) {
      return res.status(404).json({
        error: `Version ${targetHistoryVersion} not found in history.`,
      });
    }

    // 3. Reconstruct the Grid
    // We need ALL history versions newer than the target to "undo" them
    const newerVersions = await ScheduleHistory.find({
      schedule_id: scheduleId,
      history_version: { $gt: targetHistoryVersion }, // ✅ FIX: Filter by history_version
    }).sort({ history_version: -1 }); // Sort newest to oldest

    let reconstructedGrid = JSON.parse(JSON.stringify(currentSchedule.grid));

    // Apply deltas in reverse
    for (const history of newerVersions) {
      if (history.delta) {
        reconstructedGrid = jsondiffpatch.unpatch(
          reconstructedGrid,
          history.delta
        );
      }
    }

    // 4. Save as New Version (Restoration Event)
    const newHistoryVersion = (currentSchedule.history_version || 0) + 1;

    // Calculate delta (Current -> Restored)
    const delta = jsondiffpatch.diff(currentSchedule.grid, reconstructedGrid);

    // Update Schedule
    currentSchedule.grid = reconstructedGrid;
    currentSchedule.history_version = newHistoryVersion;
    await currentSchedule.save();

    // Save History Record for the Restoration
    const historyEntry = new ScheduleHistory({
      schedule_id: currentSchedule._id,
      history_version: newHistoryVersion,
      delta: delta,
      user_id: "SYSTEM",
      summary: `Restored from History v${targetHistoryVersion}`,
    });
    await historyEntry.save();

    res.status(200).json({
      message: `Successfully restored version ${targetHistoryVersion}`,
      newHistoryVersion: newHistoryVersion,
      grid: reconstructedGrid,
    });
  } catch (error) {
    console.error("Error restoring version:", error);
    res.status(500).json({ error: "Server error during restoration." });
  }
};
