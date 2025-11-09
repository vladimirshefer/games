import Phaser from 'phaser'

const JOYSTICK_MAX_DISTANCE = 68
const DEADZONE = 4

export interface InputController {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
  getDirection(): Phaser.Math.Vector2
  destroy(): void
}

export function createInputController(scene: Phaser.Scene): InputController {
  const cursors = scene.input.keyboard!.createCursorKeys()
  const joystickVector = new Phaser.Math.Vector2()
  const tempVector = new Phaser.Math.Vector2()

  let joystickBase: Phaser.GameObjects.Arc | undefined
  let joystickThumb: Phaser.GameObjects.Arc | undefined
  let joystickPointerId: number | undefined

  const baseRadius = 46
  const thumbRadius = 20

  const ensureJoystickSprites = () => {
    if (joystickBase && joystickThumb) return

    joystickBase = scene.add.circle(120, scene.scale.height - 120, baseRadius, 0xffffff, 0.1)
    joystickBase.setStrokeStyle(2, 0xffffff, 0.35)
    joystickBase.setScrollFactor(0)
    joystickBase.setDepth(5)
    joystickBase.setVisible(false)

    joystickThumb = scene.add.circle(joystickBase.x, joystickBase.y, thumbRadius, 0xffffff, 0.35)
    joystickThumb.setScrollFactor(0)
    joystickThumb.setDepth(6)
    joystickThumb.setVisible(false)
  }

  const resetJoystick = () => {
    joystickPointerId = undefined
    joystickVector.set(0, 0)
    if (joystickBase && joystickThumb) {
      joystickThumb.setPosition(joystickBase.x, joystickBase.y)
      joystickBase.setVisible(false)
      joystickThumb.setVisible(false)
    }
  }

  const handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    if (joystickPointerId !== undefined) return
    if (!pointer.primaryDown) return

    ensureJoystickSprites()
    if (!joystickBase || !joystickThumb) return

    joystickPointerId = pointer.id
    joystickBase.setPosition(pointer.x, pointer.y)
    joystickThumb.setPosition(pointer.x, pointer.y)
    joystickBase.setVisible(true)
    joystickThumb.setVisible(true)
    joystickVector.set(0, 0)
  }

  const handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (joystickPointerId !== pointer.id) return
    if (!joystickBase || !joystickThumb) return

    const dx = pointer.x - joystickBase.x
    const dy = pointer.y - joystickBase.y
    const distance = Math.hypot(dx, dy)

    if (distance <= JOYSTICK_MAX_DISTANCE) {
      joystickThumb.setPosition(pointer.x, pointer.y)
      joystickVector.set(dx / JOYSTICK_MAX_DISTANCE, dy / JOYSTICK_MAX_DISTANCE)
    } else {
      const angle = Math.atan2(dy, dx)
      const offsetX = Math.cos(angle) * JOYSTICK_MAX_DISTANCE
      const offsetY = Math.sin(angle) * JOYSTICK_MAX_DISTANCE
      joystickThumb.setPosition(joystickBase.x + offsetX, joystickBase.y + offsetY)
      joystickVector.set(offsetX / JOYSTICK_MAX_DISTANCE, offsetY / JOYSTICK_MAX_DISTANCE)
    }

    if (distance < DEADZONE) {
      joystickVector.set(0, 0)
    }
  }

  const handlePointerUp = (pointer: Phaser.Input.Pointer) => {
    if (joystickPointerId !== pointer.id) return
    resetJoystick()
  }

  scene.input.on('pointerdown', handlePointerDown)
  scene.input.on('pointermove', handlePointerMove)
  scene.input.on('pointerup', handlePointerUp)
  scene.input.on('pointerupoutside', handlePointerUp)

  return {
    cursors,
    getDirection() {
      tempVector.copy(joystickVector)

      if (cursors.left.isDown) tempVector.x -= 1
      if (cursors.right.isDown) tempVector.x += 1
      if (cursors.up.isDown) tempVector.y -= 1
      if (cursors.down.isDown) tempVector.y += 1

      const magnitude = tempVector.length()
      if (magnitude > 1) {
        tempVector.scale(1 / magnitude)
      }

      return tempVector.clone()
    },
    destroy() {
      resetJoystick()
      scene.input.off('pointerdown', handlePointerDown)
      scene.input.off('pointermove', handlePointerMove)
      scene.input.off('pointerup', handlePointerUp)
      scene.input.off('pointerupoutside', handlePointerUp)
      joystickBase?.destroy()
      joystickThumb?.destroy()
      joystickBase = undefined
      joystickThumb = undefined
      joystickPointerId = undefined
    }
  }
}
