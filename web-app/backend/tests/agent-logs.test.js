import { describe, it, expect, beforeEach } from 'vitest';
import { LogBuffer, AgentLogManager } from '../src/agents/agent-logs.js';

describe('LogBuffer', () => {
  it('应该追加日志条目', () => {
    const buffer = new LogBuffer(10);
    buffer.push({ message: 'test1' });
    buffer.push({ message: 'test2' });
    expect(buffer.getHistory()).toHaveLength(2);
  });

  it('应该在超过 maxSize 时淘汰旧日志', () => {
    const buffer = new LogBuffer(3);
    buffer.push({ message: '1' });
    buffer.push({ message: '2' });
    buffer.push({ message: '3' });
    buffer.push({ message: '4' });
    const history = buffer.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].message).toBe('2');
  });

  it('应该支持限制返回数量', () => {
    const buffer = new LogBuffer(10);
    for (let i = 1; i <= 5; i++) buffer.push({ message: String(i) });
    expect(buffer.getHistory(2)).toHaveLength(2);
    expect(buffer.getHistory(2)[0].message).toBe('4');
  });
});

describe('AgentLogManager', () => {
  it('应该为每个 role 创建独立的 LogBuffer', () => {
    const manager = new AgentLogManager();
    manager.push('sales', { message: 's1' });
    manager.push('operation', { message: 'o1' });
    expect(manager.getHistory('sales').length).toBe(1);
    expect(manager.getHistory('operation').length).toBe(1);
  });

  it('应该支持订阅者回调', () => {
    const manager = new AgentLogManager();
    const received = [];
    manager.subscribe('sales', (log) => received.push(log));
    manager.push('sales', { message: 'test' });
    expect(received).toHaveLength(1);
  });

  it('应该支持取消订阅', () => {
    const manager = new AgentLogManager();
    const callback = (log) => {};
    manager.subscribe('sales', callback);
    manager.unsubscribe('sales', callback);
    // 当没有订阅者时，会删除整个 key
    expect(manager.subscribers.get('sales')).toBeUndefined();
  });
});
