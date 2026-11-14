"""Ajoute les 9 maladies du nouveau modèle (fr + en). Idempotent : aucun doublon, aucune fiche existante modifiée.
Lancer une fois, depuis la racine du back :   python -m app.db.seed_phytoscan_diseases
La langue "wo" n'est pas fournie : l'API retombe automatiquement sur le français (get_translation).
"""
from sqlalchemy import select

from app.db.session import get_db
from app.models import Disease, DiseaseTranslation

# code: (severity_level, {lang: (name, pathogen, severity_label, description, symptoms, remedies, healthy_cmp, infected_cmp)})
DATA = {
 "early_blight": ("medium", {
  "fr": ("Alternariose (Mildiou précoce)", "Alternaria solani", "Moyenne",
         "Champignon qui forme des taches brunes en cercles concentriques sur les feuilles les plus âgées, favorisé par la chaleur et l'alternance de périodes sèches et humides.",
         ["Taches brunes en cibles (anneaux concentriques)", "Jaunissement autour des taches", "Chute des feuilles basses"],
         ["Retirer et détruire les feuilles atteintes", "Éviter d'arroser le feuillage, arroser au pied", "Pratiquer la rotation des cultures", "Appliquer un fongicide homologué si l'attaque progresse"],
         "Feuille verte uniforme, sans tache.", "Taches brunes à anneaux concentriques entourées d'un halo jaune."),
  "en": ("Early blight", "Alternaria solani", "Medium",
         "Fungal disease causing brown concentric-ring spots on older leaves, favoured by warmth and alternating dry and wet spells.",
         ["Brown target-like spots", "Yellowing around the spots", "Lower leaves dropping"],
         ["Remove and destroy affected leaves", "Water at the base, not on the foliage", "Rotate crops", "Apply an approved fungicide if the attack spreads"],
         "Uniform green leaf, no spots.", "Brown ring-patterned spots surrounded by a yellow halo.")}),
 "late_blight": ("very_high", {
  "fr": ("Mildiou tardif", "Phytophthora infestans", "Très élevée",
         "Maladie très destructrice des temps frais et saturés d'humidité. Elle peut détruire une parcelle en quelques jours.",
         ["Taches vert sombre d'aspect huileux", "Duvet blanchâtre sous la feuille", "Brunissement rapide des tiges et des fruits"],
         ["Arracher et détruire rapidement les plants atteints", "Traiter sans attendre avec un fongicide homologué", "Aérer la culture et éviter l'humidité sur le feuillage", "Ne pas composter les résidus infectés"],
         "Feuille verte, ferme, sans duvet.", "Larges taches brun-noir avec duvet blanc sous la feuille."),
  "en": ("Late blight", "Phytophthora infestans", "Very high",
         "Highly destructive disease of cool, humidity-saturated weather. It can wipe out a plot within days.",
         ["Dark green, water-soaked spots", "White fuzz under the leaf", "Rapid browning of stems and fruit"],
         ["Quickly uproot and destroy affected plants", "Treat immediately with an approved fungicide", "Improve airflow and keep foliage dry", "Do not compost infected residues"],
         "Firm green leaf, no fuzz.", "Large brown-black blotches with white fuzz underneath.")}),
 "bacterial_spot": ("high", {
  "fr": ("Gale bactérienne", "Xanthomonas spp.", "Élevée",
         "Maladie bactérienne favorisée par la chaleur humide et les pluies battantes ; elle abîme feuilles et fruits.",
         ["Petites taches sombres, grasses puis nécrosées", "Feuilles trouées", "Croûtes liégeuses sur les fruits"],
         ["Utiliser des semences saines", "Éviter l'irrigation par aspersion", "Éliminer les débris de culture", "Appliquer un produit cuprique selon la réglementation"],
         "Feuille lisse, sans perforation.", "Petites taches sombres, feuilles criblées de trous."),
  "en": ("Bacterial spot", "Xanthomonas spp.", "High",
         "Bacterial disease favoured by hot, humid weather and driving rain; it damages leaves and fruit.",
         ["Small dark, greasy then necrotic spots", "Leaves with shot-holes", "Scabby lesions on fruit"],
         ["Use healthy seed", "Avoid overhead irrigation", "Remove crop debris", "Apply a copper product where permitted"],
         "Smooth leaf, no holes.", "Small dark spots and leaves riddled with holes.")}),
 "leaf_mold": ("medium", {
  "fr": ("Cladosporiose (Moisissure)", "Passalora fulva", "Moyenne",
         "Moisissure des cultures confinées (serre) avec manque de ventilation et forte humidité.",
         ["Taches jaunes sur le dessus de la feuille", "Moisissure olive à brune au revers", "Feuilles qui se dessèchent"],
         ["Aérer et ventiler la serre", "Réduire l'humidité de l'air", "Retirer les feuilles atteintes", "Espacer les plants"],
         "Dessous de feuille propre et vert clair.", "Taches jaunes dessus, moisissure olive dessous."),
  "en": ("Leaf mold", "Passalora fulva", "Medium",
         "Mold of enclosed crops (greenhouses) with poor ventilation and high humidity.",
         ["Yellow spots on the upper leaf surface", "Olive-brown mold underneath", "Leaves drying out"],
         ["Ventilate the greenhouse", "Lower air humidity", "Remove affected leaves", "Space the plants"],
         "Clean, pale green underside.", "Yellow spots above, olive mold below.")}),
 "septoria": ("medium", {
  "fr": ("Septoriose", "Septoria lycopersici", "Moyenne",
         "Champignon favorisé par une humidité prolongée sur le feuillage ; il défolie progressivement la plante.",
         ["Nombreuses petites taches rondes à centre clair", "Bordure sombre", "Jaunissement puis chute des feuilles"],
         ["Retirer les feuilles basses atteintes", "Arroser au pied", "Rotation des cultures", "Fongicide homologué si nécessaire"],
         "Feuille uniformément verte.", "Petites taches rondes à centre gris et bordure sombre."),
  "en": ("Septoria leaf spot", "Septoria lycopersici", "Medium",
         "Fungus favoured by prolonged leaf wetness; it gradually defoliates the plant.",
         ["Many small round spots with pale centres", "Dark margin", "Leaves yellowing and dropping"],
         ["Remove affected lower leaves", "Water at the base", "Rotate crops", "Approved fungicide if needed"],
         "Uniformly green leaf.", "Small round spots with grey centres and dark margins.")}),
 "spider_mites": ("medium", {
  "fr": ("Araignées rouges (acariens)", "Tetranychus urticae", "Moyenne",
         "Ravageur minuscule qui prolifère par temps très chaud et sec et pique les cellules des feuilles.",
         ["Fines ponctuations jaunes", "Fine toile au revers des feuilles", "Feuilles bronzées et sèches"],
         ["Pulvériser de l'eau sous les feuilles pour réduire la population", "Utiliser du savon insecticide ou un acaricide adapté", "Surveiller régulièrement en saison chaude et sèche"],
         "Feuille verte, brillante, sans toile.", "Feuille ponctuée de jaune avec fine toile au revers."),
  "en": ("Spider mites", "Tetranychus urticae", "Medium",
         "Tiny pest that thrives in very hot, dry weather and pierces leaf cells.",
         ["Fine yellow stippling", "Fine webbing under leaves", "Bronzed, dry leaves"],
         ["Spray water under the leaves to reduce numbers", "Use insecticidal soap or a suitable miticide", "Scout regularly in hot, dry spells"],
         "Glossy green leaf, no webbing.", "Yellow-stippled leaf with fine webbing underneath.")}),
 "target_spot": ("medium", {
  "fr": ("Corynesporiose (Target spot)", "Corynespora cassiicola", "Moyenne",
         "Champignon des climats chauds et humides persistants, qui touche feuilles, tiges et fruits.",
         ["Taches brunes à anneaux concentriques", "Centre qui se troue en vieillissant", "Chute des feuilles"],
         ["Retirer les feuilles atteintes", "Améliorer l'aération", "Éviter le mouillage du feuillage", "Fongicide homologué si nécessaire"],
         "Feuille verte, sans anneaux.", "Taches brunes à anneaux, centre parfois troué."),
  "en": ("Target spot", "Corynespora cassiicola", "Medium",
         "Fungus of persistent warm, humid climates affecting leaves, stems and fruit.",
         ["Brown spots with concentric rings", "Centres that fall out with age", "Leaf drop"],
         ["Remove affected leaves", "Improve airflow", "Avoid wetting the foliage", "Approved fungicide if needed"],
         "Green leaf, no rings.", "Ringed brown spots, centres sometimes holed.")}),
 "tylcv": ("very_high", {
  "fr": ("Virus de l'enroulement jaune (TYLCV)", "Begomovirus (TYLCV), transmis par la mouche blanche", "Très élevée",
         "Virus transmis par les mouches blanches, favorisé par la chaleur sèche. Il n'existe pas de traitement curatif.",
         ["Feuilles enroulées vers le haut et jaunies", "Plant rabougri", "Fleurs qui tombent, peu de fruits"],
         ["Arracher et détruire les plants atteints", "Lutter contre les mouches blanches (filets, pièges jaunes)", "Utiliser des variétés tolérantes", "Éliminer les adventices hôtes"],
         "Feuille plane et verte.", "Feuille enroulée, jaunie, plante rabougrie."),
  "en": ("Tomato yellow leaf curl virus (TYLCV)", "Begomovirus (TYLCV), spread by whiteflies", "Very high",
         "Whitefly-transmitted virus favoured by hot, dry weather. There is no cure.",
         ["Leaves curled upward and yellowed", "Stunted plant", "Flower drop and poor fruit set"],
         ["Uproot and destroy affected plants", "Control whiteflies (nets, yellow traps)", "Use tolerant varieties", "Remove host weeds"],
         "Flat green leaf.", "Curled, yellowed leaf; stunted plant.")}),
 "tomato_mosaic": ("high", {
  "fr": ("Virus de la mosaïque", "Tomato mosaic virus (ToMV)", "Élevée",
         "Virus transmis surtout mécaniquement (outils, mains, semences), peu lié à la météo. Pas de traitement curatif.",
         ["Marbrures vert clair / vert foncé", "Feuilles déformées ou filiformes", "Croissance réduite"],
         ["Arracher les plants atteints", "Désinfecter outils et mains", "Utiliser des semences saines", "Ne pas fumer ni manipuler le tabac avant de toucher les plants"],
         "Feuille verte homogène.", "Feuille marbrée, déformée."),
  "en": ("Tomato mosaic virus", "Tomato mosaic virus (ToMV)", "High",
         "Virus spread mostly mechanically (tools, hands, seed), little linked to weather. No cure.",
         ["Light/dark green mottling", "Distorted or fern-like leaves", "Reduced growth"],
         ["Uproot affected plants", "Disinfect tools and hands", "Use healthy seed", "Avoid tobacco handling before touching plants"],
         "Uniform green leaf.", "Mottled, distorted leaf.")}),
}


def run() -> None:
    db = next(get_db())
    try:
        for code, (severity, langs) in DATA.items():
            if db.scalar(select(Disease).where(Disease.code == code)):
                print(f"= {code} existe déjà, ignorée")
                continue
            d = Disease(code=code, is_healthy=False, severity_level=severity)
            for lang, (name, patho, sev, desc, symptoms, remedies, hc, ic) in langs.items():
                d.translations.append(DiseaseTranslation(
                    lang=lang, name=name, pathogen=patho, severity_label=sev, description=desc,
                    symptoms=symptoms, remedies=remedies, healthy_comparison=hc, infected_comparison=ic))
            db.add(d)
            print(f"+ {code} ajoutée")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
