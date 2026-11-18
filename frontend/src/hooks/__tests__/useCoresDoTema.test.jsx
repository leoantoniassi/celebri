import '@testing-library/jest-dom';
import { renderHook, waitFor, act } from '@testing-library/react';
import useCoresDoTema from '../useCoresDoTema';

describe('useCoresDoTema', () => {
  const raiz = document.documentElement;

  beforeEach(() => {
    raiz.style.setProperty('--color-chart-1', '#0047ab');
    raiz.style.setProperty('--color-surface', '#ffffff');
    raiz.classList.remove('dark');
  });

  afterEach(() => {
    raiz.style.removeProperty('--color-chart-1');
    raiz.style.removeProperty('--color-surface');
    raiz.classList.remove('dark');
  });

  test('lê as cores aplicadas no <html>', () => {
    const { result } = renderHook(() => useCoresDoTema());

    expect(result.current['chart-1']).toBe('#0047ab');
    expect(result.current.surface).toBe('#ffffff');
  });

  test('relê quando a paleta muda (ex.: troca para o modo escuro)', async () => {
    const { result } = renderHook(() => useCoresDoTema());

    act(() => {
      raiz.classList.add('dark');
      raiz.style.setProperty('--color-chart-1', '#8ab4ff');
      raiz.style.setProperty('--color-surface', '#121212');
    });

    await waitFor(() => {
      expect(result.current['chart-1']).toBe('#8ab4ff');
      expect(result.current.surface).toBe('#121212');
    });
  });
});
