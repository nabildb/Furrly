import { z } from 'zod'
import { FlagReason, type ModerationAction } from '../generated/prisma/enums.js'
import { prisma } from './prisma.js'

/** Toda decisión lleva motivo. La nota es interna: el afectado solo ve el motivo. */
export const decisionSchema = z.object({
  reason: z.enum(FlagReason),
  note: z.string().trim().max(500).transform((s) => s || null).nullable().optional(),
})

export type Decision = z.infer<typeof decisionSchema>

/** El motivo tal y como se le explica al afectado: «Hemos retirado tu publicación por...». */
export const reasonTexts: Record<FlagReason, string> = {
  spam: 'spam o publicidad',
  inappropriate: 'contenido inapropiado u ofensivo',
  fake: 'contenido falso o engañoso',
  other: 'incumplir las normas de Furrly',
}

interface ActionInput extends Partial<Decision> {
  moderatorId: string
  action: ModerationAction
  targetType: string
  targetId?: string
  targetLabel: string
  targetUserId?: string
}

/** Deja constancia de una decisión en el registro de moderación. */
export function recordAction({ targetLabel, ...action }: ActionInput) {
  return prisma.moderationLog.create({ data: { ...action, targetLabel: targetLabel.slice(0, 200) } })
}
