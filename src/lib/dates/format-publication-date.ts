const publicationDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export function formatPublicationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Publication date must be a valid date.");
  }

  return publicationDateFormatter.format(date);
}
