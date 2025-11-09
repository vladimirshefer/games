import { STATS_FOR_RUN } from './profile.ts'

export function save(state: any) {
  localStorage.setItem('hordes-save-file', JSON.stringify(state))
}

export function load(): any {
  return JSON.parse(localStorage.getItem('hordes-save-file') ?? '{}')
}

export function saveAllAfterRun() {
  const load1 = load()
  const totalDamageByWeapon = load1.totalDamageByWeapon ?? {}
  totalDamageByWeapon.sword = (totalDamageByWeapon.sword ?? 0) + STATS_FOR_RUN.weapon_damage.sword
  totalDamageByWeapon.aura = (totalDamageByWeapon.aura ?? 0) + STATS_FOR_RUN.weapon_damage.aura
  totalDamageByWeapon.bomb = (totalDamageByWeapon.bomb ?? 0) + STATS_FOR_RUN.weapon_damage.bomb
  totalDamageByWeapon.pistol = (totalDamageByWeapon.pistol ?? 0) + STATS_FOR_RUN.weapon_damage.pistol
  load1.totalDamageByWeapon = totalDamageByWeapon
  save(load1)
}

export function getUnlockedPerks(): string[] {
  const load1 = load()

  return [
    ...Object.keys(PERK_UNLOCKS)
      .filter((it) => PERK_UNLOCKS[it](load1))
      .filter((it) => it != null)
      .map((it) => it + ':unlocked')
  ] as string[]
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
