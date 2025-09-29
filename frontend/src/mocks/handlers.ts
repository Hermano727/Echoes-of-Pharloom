import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/home', () => {
    return HttpResponse.json({
      user: { isGuest: true },
      streaks: { daily: 3, focus: 1, noDeath: 2 },
      recentSessions: [
        { sessionId: 's1', startedAt: new Date().toISOString(), durationMin: 60, completed: true, areas: ['Bonebottom', 'Far Fields'] },
        { sessionId: 's2', startedAt: new Date(Date.now() - 86400000).toISOString(), durationMin: 30, completed: false, areas: ['Choral Chambers'] }
      ],
    });
  }),
  http.get('/areas', () => {
    return HttpResponse.json({
      areas: [
        { id: 'bonebottom', name: 'Bonebottom' },
        { id: 'far-fields', name: 'Far Fields' },
        { id: 'hunters-path', name: "Hunter's Path" },
        { id: 'choral-chambers', name: 'Choral Chambers' },
      ],
    });
  }),
];
