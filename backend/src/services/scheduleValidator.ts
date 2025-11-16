interface Course {
  code: string;
  duration: number;
}

interface ExternalSection {
  course: string;
  time_Slot: string[];
}

interface Schedule {
  level: number;
  section: string;
  grid: {
    [day: string]: {
      [time: string]: string | null;
    };
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateSchedule = (
  aiOutput: string,
  sweCourses: Course[],
  externalSections: ExternalSection[]
): ValidationResult => {
  const errors: string[] = [];

  let schedule: Schedule;
  try {
    schedule = JSON.parse(aiOutput);
  } catch (error) {
    return {
      isValid: false,
      errors: ["The response received from the AI is not valid JSON."],
    };
  }

  const requiredKeys: (keyof Schedule)[] = ["level", "section", "grid"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

  requiredKeys.forEach((key) => {
    if (!schedule.hasOwnProperty(key)) {
      errors.push(
        `JSON structure is incomplete, the main field "${key}" is missing.`
      );
    }
  });

  if (!schedule.grid || typeof schedule.grid !== "object") {
    errors.push(`The 'grid' field is missing or is not an object.`);
  } else {
    days.forEach((day) => {
      if (!schedule.grid.hasOwnProperty(day)) {
        errors.push(
          `The schedule 'grid' is incomplete, the day "${day}" is missing.`
        );
      }
    });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const scheduleCounts: { [courseCode: string]: number } = {};
  for (const day of days) {
    for (const timeSlot in schedule.grid[day]) {
      const courseCode = schedule.grid[day][timeSlot];
      if (courseCode) {
        scheduleCounts[courseCode] = (scheduleCounts[courseCode] || 0) + 1;
      }
    }
  }

  sweCourses.forEach((course) => {
    const scheduledCount = scheduleCounts[course.code] || 0;
    if (scheduledCount !== course.duration) {
      errors.push(
        `Course "${course.code}" was scheduled ${scheduledCount} times instead of the required ${course.duration}.`
      );
    }
  });

  const occupiedSlots = new Map<string, string>();

  externalSections.forEach((section) => {
    section.time_Slot.forEach((slot) => {
      const [day, time] = slot.split(" ");
      const slotKey = `${day}-${time}`;
      occupiedSlots.set(slotKey, section.course);
    });
  });

  for (const day of days) {
    for (const timeSlot in schedule.grid[day]) {
      const courseCode = schedule.grid[day][timeSlot];
      const slotKey = `${day}-${timeSlot}`;
      const occupant = occupiedSlots.get(slotKey);

      if (occupant) {
        if (occupant !== courseCode) {
          errors.push(
            `Schedule conflict: Course "${courseCode}" was placed in a slot reserved for the external course "${occupant}" at [${day} ${timeSlot}].`
          );
        }
      } else if (courseCode) {
        occupiedSlots.set(slotKey, courseCode);
      }
    }
  }

  externalSections.forEach((section) => {
    section.time_Slot.forEach((slot) => {
      const [day, time] = slot.split(" ");
      if (!schedule.grid[day] || schedule.grid[day][time] !== section.course) {
        errors.push(
          `The fixed external course "${section.course}" was not placed in its correct slot at [${day} ${time}].`
        );
      }
    });
  });

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
};
