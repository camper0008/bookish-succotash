export type Dated = { date: Date };

export type Restock = Dated & {
  type: "restock";
  amount: number;
};

export type DoseChanged = Dated & {
  type: "dose_changed";
  per_day: number;
};

export type EndOfDay = Dated & {
  type: "day_end";
  per_day: number;
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

export function collapseEvents(
  state: State,
  events: Event[],
  days: Day[],
): Day[] {
  const current = events.shift();
  if (!current) {
    return days;
  }
  if (!sameDay(state.today, current.date)) {
    throw new Error("panic: skipped an evaluate");
  }
  switch (current.type) {
    case "dose_changed":
      state.dosePerDay = current.per_day;
      break;
    case "day_end":
      state.pillsLeft -= state.dosePerDay;
      state.today.setDate(state.today.getDate() + 1);
      break;
    case "restock": {
      state.pillsLeft += current.amount;
      break;
    }
  }
  return collapseEvents(state, events, days);
}
