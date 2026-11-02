import React from 'react';
import { Cpu, Leaf, ShieldCheck } from 'lucide-react';

export default function FooterBanner() {
  return (
    <footer className="bottom-features-bar">
      <div className="features-bar-container">
        {/* Pilier 1 */}
        <div className="feature-pill-item">
          <div className="feature-pill-icon">
            <Cpu size={26} />
          </div>
          <div>
            <div className="feature-pill-title">IA & Vision par ordinateur</div>
            <div className="feature-pill-desc">
              Une technologie de pointe entraînée avec Octopus au service des plantes
            </div>
          </div>
        </div>

        {/* Pilier 2 */}
        <div className="feature-pill-item">
          <div className="feature-pill-icon">
            <Leaf size={26} />
          </div>
          <div>
            <div className="feature-pill-title">Simple et intuitif</div>
            <div className="feature-pill-desc">
              Une application pensée pour les agriculteurs sur le terrain
            </div>
          </div>
        </div>

        {/* Pilier 3 */}
        <div className="feature-pill-item">
          <div className="feature-pill-icon">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="feature-pill-title">Sécurisé & Souverain</div>
            <div className="feature-pill-desc">
              Vos données agricoles et analyses restent sous votre contrôle
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
