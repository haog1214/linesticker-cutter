import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { subDays, format, eachDayOfInterval } from "date-fns";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

function generateDailyData(days: number) {
  const rand = seededRandom(42);
  const end = new Date();
  const start = subDays(end, days - 1);
  const dates = eachDayOfInterval({ start, end });

  return dates.map((date, i) => {
    const trend = 1 + i * 0.003;
    const weekday = date.getDay();
    const weekFactor = weekday === 0 || weekday === 6 ? 0.6 : 1;
    const pageViews = Math.round((15 + rand() * 25) * trend * weekFactor);
    const visits = Math.round(pageViews * (0.6 + rand() * 0.2));
    const visitors = Math.round(visits * (0.55 + rand() * 0.2));
    const duration = Math.round((120 + rand() * 180) * (weekFactor * 0.8 + 0.2));
    const bounceRate = +(65 + rand() * 20).toFixed(1);
    return {
      date: format(date, "yyyy-MM-dd"),
      pageViews,
      visits,
      visitors,
      duration,
      bounceRate,
    };
  });
}

export const analyticsRouter = router({
  summary: publicProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(({ input }) => {
      const data = generateDailyData(input.days);
      const prev = generateDailyData(input.days * 2).slice(0, input.days);

      const sum = (arr: typeof data, key: keyof (typeof data)[0]) =>
        arr.reduce((acc, d) => acc + (d[key] as number), 0);

      const avgDuration = Math.round(sum(data, "duration") / data.length);
      const avgBounce = +(sum(data, "bounceRate") / data.length).toFixed(1);
      const prevAvgDuration = Math.round(sum(prev, "duration") / prev.length);
      const prevAvgBounce = +(sum(prev, "bounceRate") / prev.length).toFixed(1);

      const pct = (cur: number, old: number) =>
        old === 0 ? 100 : +((((cur - old) / old) * 100).toFixed(1));

      const totalPV = sum(data, "pageViews");
      const totalVisits = sum(data, "visits");
      const totalVisitors = sum(data, "visitors");
      const prevPV = sum(prev, "pageViews");
      const prevVisits = sum(prev, "visits");
      const prevVisitors = sum(prev, "visitors");

      return {
        pageViews: { value: totalPV, change: pct(totalPV, prevPV) },
        visits: { value: totalVisits, change: pct(totalVisits, prevVisits) },
        visitors: { value: totalVisitors, change: pct(totalVisitors, prevVisitors) },
        duration: {
          value: avgDuration,
          change: pct(avgDuration, prevAvgDuration),
        },
        bounceRate: { value: avgBounce, change: pct(avgBounce, prevAvgBounce) },
        daily: data,
      };
    }),
});
