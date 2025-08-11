class GroupEventData extends EventData {
  constructor(
    id,
    title,
    description,
    startDateTime,
    endDateTime,
    pollCreationDateTime,
    pollVotesCountingDateTime,
    minPositiveVotersCount
  ) {
    super(
      id,
      title,
      description,
      startDateTime,
      endDateTime
    );

    this.pollCreationDateTime = pollCreationDateTime;
    this.pollVotesCountingDateTime = pollVotesCountingDateTime;
    this.minPositiveVotersCount = minPositiveVotersCount;
  }

  static parseFromJson(jsonStr) {
    const jsonObj = JSON.parse(jsonStr);

    return new GroupEventData(
      jsonObj.id,
      jsonObj.title,
      jsonObj.description,
      new Date(jsonObj.startDateTime),
      new Date(jsonObj.endDateTime),
      new Date(jsonObj.pollCreationDateTime),
      new Date(jsonObj.pollVotesCountingDateTime),
      Number.parseFloat(jsonObj.minPositiveVotersCount)
    );
  }

  isValid() {
    return this.id &&
           this.title &&
           this.startDateTime &&
           this.endDateTime &&
           this.pollCreationDateTime &&
           this.pollVotesCountingDateTime &&
           this.minPositiveVotersCount;
  }

  getActivityName() {
    return this.title.substring(3);
  }

  getStartTimeString() {
    return Utilities.formatDate(this.startDateTime, CONFIG_SCRIPT_TIMEZONE, 'HH:mm');
  }

  getStartDateString() {
    return `${Utils.getUkrainianDayOfWeek(this.startDateTime)} ${Utilities.formatDate(this.startDateTime, CONFIG_SCRIPT_TIMEZONE, 'dd.MM')}`;
  }

  getStartDateTimeString() {
    return `${this.getStartTimeString()} (${this.getStartDateString()})`;
  }

  equals(other) {
    return other instanceof GroupEventData &&
           this.id === other.id &&
           this.title === other.title &&
           this.startDateTime === other.startDateTime &&
           this.endDateTime === other.endDateTime &&
           this.pollCreationDateTime === other.pollCreationDateTime &&
           this.pollVotesCountingDateTime === other.pollVotesCountingDateTime &&
           this.minPositiveVotersCount === other.minPositiveVotersCount;
  }
}
