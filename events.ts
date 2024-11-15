export type Dated = { date: Date };

export type Restock = Dated & {
  type: "restock";
  pillsLeft: number;
};

export type DoseChanged = Dated & {
  type: "dose_changed";
  dosePerDay: number;
};

export type EndOfDay = Dated & {
  type: "day_end";
};

export type Created =
  & Dated
  & Omit<Restock, "type">
  & Omit<DoseChanged, "type">
  & {
    type: "created";
  };

export type Event = Restock | DoseChanged | EndOfDay;

type Day = {
  index: number;
  amount: number;
};

function sameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

type State = {
  today: Date;
  dosePerDay: number;
  pillsLeft: number;
};

export function doStuff(created: Created, events: Event[]): Day[] {
  const prepared = insertEndOfDayEvents(created, events);
  const state: State = {
    today: new Date(created.date),
    dosePerDay: created.dosePerDay,
    pillsLeft: created.pillsLeft,
  };
  const collapsed = evaluateEvents(state, events, []);
  return collapsed;
}

function dateToNumber(date: Date): number {
  /// 18th may, 2004 -> 20040518
  return 10000 * date.getFullYear() + 100 * (date.getMonth() + 1) +
    date.getDate();
}

function dateToString(date: Date): string {
  /// 18th may, 2004 -> "20040518"
  return dateToNumber(date).toString();
}

function uniqueDatesFromEvents(created: Created, events: Event[]): number[] {
  const createdDate = dateToNumber(created.date);
  const dates = [createdDate];
  for (const event of events) {
    const date = dateToNumber(event.date);
    if (date < createdDate) {
      throw new Error("panic: created was not the first event found");
    }
    if (dates.includes(date)) {
      continue;
    }
    dates.push(dateToNumber(event.date));
  }
  dates.sort();
  return dates;
}

function insertEndOfDayEvents(created: Created, events: Event[]): Event[] {
  const dates: { [key: string]: Event[] } = {};
  const modifiedEvents = structuredClone(events);
  const counter = new Date(created.date);
  while (true) {
    const date = dateToString(counter);
    if (!dates[date]) {
      const endOfDayDate = structuredClone(counter);
      endOfDayDate.setHours(23);
      endOfDayDate.setMinutes(59);
      endOfDayDate.setSeconds(59);
      const endOfDay: EndOfDay = {
        type: "day_end",
        date: endOfDayDate,
      };
      dates[date] = [endOfDay];
    }
    const event = modifiedEvents.shift();
    if (!event) {
      break;
    }
    if (date !== dateToString(event.date)) {
      modifiedEvents.unshift(event);
      counter.setDate(counter.getDate() + 1);
      continue;
    }
    dates[date].push(event);
    counter.setDate(counter.getDate() + 1);
  }

  return Object
    .values(dates)
    .reduce((acc, v) => [...acc, ...v])
    .toSorted((a, b) => a.date.getTime() - b.date.getTime());
}

function evaluateEvents(
  state: State,
  events: Event[],
  days: Day[],
): Day[] {
  const current = events.shift();
  if (!current) {
    return days;
  }
  if (!sameDay(state.today, current.date)) {
    throw new Error("panic: skipped a day");
  }
  switch (current.type) {
    case "dose_changed":
      state.dosePerDay = current.dosePerDay;
      break;
    case "day_end":
      state.pillsLeft -= state.dosePerDay;
      state.today.setDate(state.today.getDate() + 1);
      break;
    case "restock": {
      state.pillsLeft += current.pillsLeft;
      break;
    }
  }
  return evaluateEvents(state, events, days);
}
