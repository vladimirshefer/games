import { STATS_FOR_RUN } from './profile.ts'
import { BASE_UNLOCKED_HEROES } from './heroUnlocks.ts'

const SAVE_KEY = 'hordes-save-file'

interface HordesSaveFile {
  totalDamageByWeapon?: Record<string, number>
  unlockedHeroes?: string[]
}

function applyDefaults(save: HordesSaveFile): Required<HordesSaveFile> {
  return {
    totalDamageByWeapon: save.totalDamageByWeapon ?? {},
    unlockedHeroes: Array.from(new Set(save.unlockedHeroes?.length ? save.unlockedHeroes : BASE_UNLOCKED_HEROES))
  }
}

export function save(state: HordesSaveFile) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function load(): Required<HordesSaveFile> {
  try {
    const parsed: HordesSaveFile = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}')
    return applyDefaults(parsed ?? {})
  } catch {
    return applyDefaults({})
  }
}

export function saveAllAfterRun() {
  const saveData = load()
  const totalDamageByWeapon = saveData.totalDamageByWeapon
  totalDamageByWeapon.sword = (totalDamageByWeapon.sword ?? 0) + (STATS_FOR_RUN.weapon_damage.sword ?? 0)
  totalDamageByWeapon.aura = (totalDamageByWeapon.aura ?? 0) + (STATS_FOR_RUN.weapon_damage.aura ?? 0)
  totalDamageByWeapon.bomb = (totalDamageByWeapon.bomb ?? 0) + (STATS_FOR_RUN.weapon_damage.bomb ?? 0)
  totalDamageByWeapon.pistol = (totalDamageByWeapon.pistol ?? 0) + (STATS_FOR_RUN.weapon_damage.pistol ?? 0)
  save({ ...saveData, totalDamageByWeapon })
}

export function getUnlockedPerks(): string[] {
  const saveData = load()

  return [
    ...Object.keys(PERK_UNLOCKS)
      .filter((it) => PERK_UNLOCKS[it](saveData))
      .filter((it) => it != null)
      .map((it) => it + ':unlocked')
  ] as string[]
}

export function getUnlockedHeroes() {
  return load().unlockedHeroes
}

export function isHeroUnlocked(heroId: string) {
  return getUnlockedHeroes().includes(heroId)
}

export function unlockHero(heroId: string) {
  const saveData = load()
  if (saveData.unlockedHeroes.includes(heroId)) return
  save({
    ...saveData,
    unlockedHeroes: [...saveData.unlockedHeroes, heroId]
  })
}

const PERK_UNLOCKS: { [key: string]: (save: any) => boolean } = {
  sword: (it) => it.totalDamageByWeapon?.sword ?? 0 > 0,
  swordMk2: (it) => it.totalDamageByWeapon?.sword ?? 0 > 200,
  swordMk3: (it) => it.totalDamageByWeapon?.sword ?? 0 > 400,
  swordMk4: (it) => it.totalDamageByWeapon?.sword ?? 0 > 600,
  swordMk5: (it) => it.totalDamageByWeapon?.sword ?? 0 > 800,
  pistol: (it) => it.totalDamageByWeapon?.pistol ?? 0 > 0,
  pistolMk2: (it) => it.totalDamageByWeapon?.pistol ?? 0 > 200,
  pistolMk3: (it) => it.totalDamageByWeapon?.pistol ?? 0 > 400,
  pistolMk4: (it) => it.totalDamageByWeapon?.pistol ?? 0 > 600,
  pistolMk5: (it) => it.totalDamageByWeapon?.pistol ?? 0 > 800,
  bomb: (it) => it.totalDamageByWeapon?.bomb ?? 0 > 0,
  bombMk2: (it) => it.totalDamageByWeapon?.bomb ?? 0 > 200,
  bombMk3: (it) => it.totalDamageByWeapon?.bomb ?? 0 > 400,
  bombMk4: (it) => it.totalDamageByWeapon?.bomb ?? 0 > 600,
  bombMk5: (it) => it.totalDamageByWeapon?.bomb ?? 0 > 800,
  aura: (it) => it.totalDamageByWeapon?.aura ?? 0 > 0,
  auraMk2: (it) => it.totalDamageByWeapon?.aura ?? 0 > 200,
  auraMk3: (it) => it.totalDamageByWeapon?.aura ?? 0 > 400,
  auraMk4: (it) => it.totalDamageByWeapon?.aura ?? 0 > 600,
  auraMk5: (it) => it.totalDamageByWeapon?.aura ?? 0 > 800
}
