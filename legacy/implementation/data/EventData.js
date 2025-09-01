class EventData {
  constructor(
    id,
    title,
    description,
    startDateTime,
    endDateTime
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.startDateTime = startDateTime;
    this.endDateTime = endDateTime;
  }

  isValid() {
    return this.id &&
           this.title &&
           this.startDateTime &&
           this.endDateTime;
  }
}
