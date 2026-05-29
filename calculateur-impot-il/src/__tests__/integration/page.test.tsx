import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CalculatorPage } from '@/ui/pages/CalculatorPage';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  // Évite tout appel réseau réel pendant le rendu (FX -> fallback).
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('réseau désactivé en test');
  }));
});

describe('CalculatorPage (smoke)', () => {
  it('se monte et affiche les éléments clés sans erreur', () => {
    render(<CalculatorPage />);
    expect(
      screen.getByRole('heading', { name: /Calculateur d'impôt israélien/i }),
    ).toBeInTheDocument();
    // Métriques de résultat présentes
    expect(screen.getByText(/TOTAL annuel/i)).toBeInTheDocument();
    expect(screen.getByText(/TOTAL mensuel/i)).toBeInTheDocument();
    // Section Bituah rendue (orchestrateur câblé)
    expect(screen.getByText(/Bituah Leumi \+ Briout/i)).toBeInTheDocument();
    // Disclaimer obligatoire (phrase distinctive)
    expect(screen.getByText(/ne remplace pas/i)).toBeInTheDocument();
  });
});
