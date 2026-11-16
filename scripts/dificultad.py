# Calcula la dificultad de cada receta con la misma regla para todas, según el esfuerzo real.
# Uso: python3 scripts/dificultad.py          (muestra el resultado)
#      python3 scripts/dificultad.py --guardar (lo escribe en las recetas)
import json, glob, sys, collections
NIVEL = {"novato": 0, "basico": 0.5, "cocinillas": 1}
EXIGENTES = {"risotto", "arroz-paella", "emulsiones", "pasta-fresca", "empanada", "quiche", "masa-pizza", "bechamel"}
def puntos(r):
    t = r["tiempoMin"]
    p = NIVEL[r["nivel"]]
    p += 3 if t >= 75 else 2 if t >= 45 else 1 if t >= 25 else 0
    p += 0.5 if len(r["pasos"]) >= 6 else 0
    p += 0.5 if len(r["tecnicas"]) >= 3 else 0
    p += 1 if EXIGENTES & set(r["tecnicas"]) else 0
    return p
# Ajustes a mano donde el tiempo engaña: largos pero sencillos, o rápidos pero delicados
AJUSTES = {"sopa-fideos": 2, "tomates-confitados": 2, "empanadillas": 2,
           "merluza-salsa-verde": 2, "huevos-rotos": 2}
def dificultad(r):
    if r["id"] in AJUSTES: return AJUSTES[r["id"]]
    p = puntos(r)
    return 1 if p <= 1 else 2 if p <= 2.5 else 3
if __name__ == "__main__":
    rutas = sorted(glob.glob("src/content/recipes/*.json"))
    grupos = collections.defaultdict(list)
    for ruta in rutas:
        r = json.load(open(ruta)); d = dificultad(r)
        grupos[d].append(f'{r["id"]} ({r["tiempoMin"]} min)')
        if "--guardar" in sys.argv and r["dificultad"] != d:
            r["dificultad"] = d
            json.dump(r, open(ruta, "w"), ensure_ascii=False, indent=2); open(ruta, "a").write("\n")
    for d, nombre in ((1, "Fácil"), (2, "Media"), (3, "Elaborada")):
        print(f"{nombre}: {len(grupos[d])}"); print("   " + ", ".join(grupos[d]))
