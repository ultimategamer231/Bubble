import { toCommand } from '../headless';

jest.mock('@/spike/spikeController', () => ({ dispatchSpike: jest.fn() }));
jest.mock('../../../modules/focus-native', () => ({ __esModule: true, default: {} }));

describe('headless payload → command', () => {
  it('maps Reconcile with the foreground flag', () => {
    expect(toCommand({ command: 'Reconcile' }, false)).toEqual({
      type: 'Reconcile',
      foreground: false,
    });
    expect(toCommand({ command: 'Reconcile', sessionId: 's1' }, true)).toEqual({
      type: 'Reconcile',
      foreground: true,
    });
  });

  it('button commands always carry the session ID they were drawn for', () => {
    expect(toCommand({ command: 'Pause', sessionId: 's1' }, false)).toEqual({
      type: 'Pause',
      sessionId: 's1',
    });
    expect(toCommand({ command: 'Reset', sessionId: 's1' }, false)).toEqual({
      type: 'Reset',
      sessionId: 's1',
    });
    expect(toCommand({ command: 'Pause' }, false)).toBeNull();
    expect(toCommand({ command: 'Pause', sessionId: null }, false)).toBeNull();
  });

  it('rejects unknown commands', () => {
    expect(toCommand({ command: 'DeleteAll', sessionId: 's1' }, false)).toBeNull();
    expect(toCommand({ command: '', sessionId: 's1' }, false)).toBeNull();
  });
});
