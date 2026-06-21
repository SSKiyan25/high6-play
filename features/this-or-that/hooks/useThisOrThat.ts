'use client'

import { useState, useEffect } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import type { TotQuestion } from '../types'

interface UseThisOrThatOptions {
  roomCode: string
  initialQuestions: TotQuestion[]
  initialIndex: number
}

interface UseThisOrThatState {
  currentQuestion: TotQuestion | null
  currentIndex: number
  totalQuestions: number
  isGameOver: boolean
}

/**
 * Subscribes to room-{code}-game channel.
 * Listens for question-advanced (updates currentIndex) and game-ended
 * (sets isGameOver). Returns current question state for the player view.
 */
export function useThisOrThat({
  roomCode,
  initialQuestions,
  initialIndex,
}: UseThisOrThatOptions): UseThisOrThatState {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isGameOver, setIsGameOver] = useState(false)

  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    channel.bind(
      'question-advanced',
      (data: { nextIndex: number }) => {
        setCurrentIndex(data.nextIndex)
      },
    )

    channel.bind('game-ended', () => {
      setIsGameOver(true)
    })

    return () => {
      channel.unbind('question-advanced')
      channel.unbind('game-ended')
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode])

  const currentQuestion =
    currentIndex < initialQuestions.length
      ? initialQuestions[currentIndex]
      : null

  return {
    currentQuestion,
    currentIndex,
    totalQuestions: initialQuestions.length,
    isGameOver,
  }
}
