using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;

namespace RecipeApi.Services;

public class CronScheduleCalculator(IConfiguration configuration)
{
    private static readonly Regex EnvExpression = new(
        @"^\$\{(?<name>[A-Za-z_][A-Za-z0-9_]*)(:-(?<default>.*))?\}$",
        RegexOptions.Compiled);

    public DateTimeOffset GetNextOccurrence(string cronExpression, DateTimeOffset utcNow)
    {
        var resolved = ResolveExpression(cronExpression);
        var cron = ParsedCron.Parse(resolved);
        var cursor = utcNow.ToUniversalTime().AddMinutes(1);
        cursor = new DateTimeOffset(
            cursor.Year,
            cursor.Month,
            cursor.Day,
            cursor.Hour,
            cursor.Minute,
            0,
            TimeSpan.Zero);

        var searchLimit = cursor.AddYears(5);
        while (cursor <= searchLimit)
        {
            if (cron.Matches(cursor))
            {
                return cursor;
            }

            cursor = cursor.AddMinutes(1);
        }

        throw new InvalidOperationException($"Cron expression '{resolved}' has no occurrence within five years.");
    }

    public string ResolveExpression(string expression)
    {
        var trimmed = expression.Trim();
        var match = EnvExpression.Match(trimmed);
        if (!match.Success)
        {
            return trimmed;
        }

        var name = match.Groups["name"].Value;
        var configured = configuration[name];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured.Trim();
        }

        var fallback = match.Groups["default"];
        if (fallback.Success && !string.IsNullOrWhiteSpace(fallback.Value))
        {
            return fallback.Value.Trim();
        }

        throw new InvalidOperationException($"Missing required cron configuration '{name}'.");
    }

    private sealed class ParsedCron
    {
        private readonly CronField _minute;
        private readonly CronField _hour;
        private readonly CronField _dayOfMonth;
        private readonly CronField _month;
        private readonly CronField _dayOfWeek;

        private ParsedCron(
            CronField minute,
            CronField hour,
            CronField dayOfMonth,
            CronField month,
            CronField dayOfWeek)
        {
            _minute = minute;
            _hour = hour;
            _dayOfMonth = dayOfMonth;
            _month = month;
            _dayOfWeek = dayOfWeek;
        }

        public static ParsedCron Parse(string expression)
        {
            var parts = expression.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length != 5)
            {
                throw new InvalidOperationException($"Cron expression '{expression}' must contain five fields.");
            }

            return new ParsedCron(
                CronField.Parse(parts[0], 0, 59),
                CronField.Parse(parts[1], 0, 23),
                CronField.Parse(parts[2], 1, 31),
                CronField.Parse(parts[3], 1, 12),
                CronField.Parse(parts[4], 0, 7, normalizeSevenToZero: true));
        }

        public bool Matches(DateTimeOffset instant)
        {
            return _minute.Contains(instant.Minute)
                && _hour.Contains(instant.Hour)
                && _dayOfMonth.Contains(instant.Day)
                && _month.Contains(instant.Month)
                && _dayOfWeek.Contains((int)instant.DayOfWeek);
        }
    }

    private sealed class CronField
    {
        private readonly HashSet<int> _values;

        private CronField(HashSet<int> values)
        {
            _values = values;
        }

        public static CronField Parse(
            string field,
            int min,
            int max,
            bool normalizeSevenToZero = false)
        {
            var values = new HashSet<int>();

            foreach (var segment in field.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                AddSegment(values, segment, min, max, normalizeSevenToZero);
            }

            if (values.Count == 0)
            {
                throw new InvalidOperationException($"Cron field '{field}' does not contain any values.");
            }

            return new CronField(values);
        }

        public bool Contains(int value) => _values.Contains(value);

        private static void AddSegment(
            HashSet<int> values,
            string segment,
            int min,
            int max,
            bool normalizeSevenToZero)
        {
            var stepParts = segment.Split('/', StringSplitOptions.TrimEntries);
            if (stepParts.Length > 2)
            {
                throw new InvalidOperationException($"Invalid cron segment '{segment}'.");
            }

            var step = stepParts.Length == 2 ? ParseNonNegativeInt(stepParts[1], segment) : 1;
            if (step == 0)
            {
                throw new InvalidOperationException($"Cron step in segment '{segment}' must be greater than zero.");
            }
            var range = stepParts[0];

            int start;
            int end;
            if (range == "*")
            {
                start = min;
                end = max;
            }
            else if (range.Contains('-'))
            {
                var bounds = range.Split('-', StringSplitOptions.TrimEntries);
                if (bounds.Length != 2)
                {
                    throw new InvalidOperationException($"Invalid cron range '{segment}'.");
                }

                start = ParseValue(bounds[0], min, max, normalizeSevenToZero, segment);
                end = ParseValue(bounds[1], min, max, normalizeSevenToZero, segment);
            }
            else
            {
                start = ParseValue(range, min, max, normalizeSevenToZero, segment);
                end = start;
            }

            if (start > end)
            {
                throw new InvalidOperationException($"Cron range '{segment}' starts after it ends.");
            }

            for (var value = start; value <= end; value += step)
            {
                values.Add(normalizeSevenToZero && value == 7 ? 0 : value);
            }
        }

        private static int ParseValue(
            string raw,
            int min,
            int max,
            bool normalizeSevenToZero,
            string segment)
        {
            var value = ParseNonNegativeInt(raw, segment);
            if (normalizeSevenToZero && value == 7)
            {
                return value;
            }

            if (value < min || value > max)
            {
                throw new InvalidOperationException($"Cron value '{value}' in segment '{segment}' is outside {min}-{max}.");
            }

            return value;
        }

        private static int ParseNonNegativeInt(string raw, string segment)
        {
            if (!int.TryParse(raw, out var value) || value < 0)
            {
                throw new InvalidOperationException($"Invalid cron value '{raw}' in segment '{segment}'.");
            }

            return value;
        }
    }
}
