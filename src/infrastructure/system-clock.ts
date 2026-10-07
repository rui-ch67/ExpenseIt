import type { Clock } from "@/application/ports";
import { type IsoDate, todayIn } from "@/domain/dates";

/** "Today" in the UK, where ExpenseIt's users are. */
export class SystemClock implements Clock {
  constructor(private readonly timeZone = "Europe/London") {}

  today(): IsoDate {
    return todayIn(this.timeZone);
  }
}
