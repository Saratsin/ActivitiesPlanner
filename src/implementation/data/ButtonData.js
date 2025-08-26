class ButtonData {
    constructor(parentData) {
        this.activity = parentData?.activity;
        this.date = parentData?.date;
        this.start = parentData?.startDateTime;
        this.end = parentData?.endDateTime;
    }

    static fromActivity(parentData, activity) {
        const instance = new ButtonData(parentData);
        instance.activity = activity;
        instance.type = "SelectActivity";
        return instance;
    }
    static fromDate(parentData, date) {
        const instance = new ButtonData(parentData);
        instance.date = date.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
        instance.type = "SelectDate";
        return instance;
    }
    static fromTime(parentData, startDateTime, endDateTime) {
        const instance = new ButtonData(parentData);
        instance.date = undefined
        instance.activity = undefined
        instance.start = startDateTime.toTimeString().slice(0, 5);
        instance.end = endDateTime.toTimeString().slice(0, 5);
        instance.type = "SelectTime";
        return instance;
    }

    toString() {
        return JSON.stringify(this);
    }
}

class ConfirmButtonData extends ButtonData {
    constructor(parentData) {
        super(parentData);
        this.type = "Confirm";
    }
}