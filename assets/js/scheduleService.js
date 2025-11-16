class ScheduleServiceFrontend {
    async getScheduleForLevel(level) {
        return await window.APIClient.get(`/api/schedule/level/${level}`);
    }

    async generateSchedule(level) {
        return await window.APIClient.post('/api/schedule/generate', { level });
    }

    async publishSchedule(level) {
        return await window.APIClient.post('/api/schedule/publish', { level });
    }
}

const scheduleService = new ScheduleServiceFrontend();
window.scheduleService = scheduleService;
console.log('✅ ScheduleService loaded');