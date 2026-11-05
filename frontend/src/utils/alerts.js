// Calcule la liste des alertes phytosanitaires à partir des plantes (même règle que le back : GET /alerts).
// Fonctionne en mode simulation ET en mode live, et reste synchronisé dès qu'une plante change.

// 'Aubergine (Solanum melongena)' -> 'Aubergine' ; 'Parcelle B1 - Plein champ' -> 'Parcelle B1'
const shortPart = (text, separator) => (text || "").split(separator)[0].trim();

export function buildAlerts(plants = []) {
  return plants
    .filter((p) => p.status !== "saine")
    // Les plantes malades d'abord, puis celles à surveiller
    .sort((a, b) => (a.status === "malade" ? 0 : 1) - (b.status === "malade" ? 0 : 1))
    .map((p) => {
      const plot = shortPart(p.plot, " - ");
      return {
        id: `alert-${p.id}`,
        level: p.status === "malade" ? "danger" : "warning",
        title: `${p.name} (${shortPart(p.species, "(")})` + (plot ? ` — ${plot}` : ""),
        description: p.alert || p.details?.notes || "",
        date: p.lastObservation || "",
        plant: p
      };
    });
}
