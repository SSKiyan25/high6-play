'use client'

import { useState, useEffect } from 'react'
import { pusherClient } from '@/lib/pusher/client'
import type { TotResults, TotQuestion } from '../types'

interface UseVotesOptions {
  roomCode: string
  initialResults?: TotResults | null
  /** Number of non-host players in the room. Used to detect when all votes are in. */
  totalPlayers: number
  /** Called when all non-host players have voted on the current question. */
  onAllVoted: () => void
}

/**
 * Subscribes to room-{code}-game Pusher channel.
 * Listens for vote-submitted events and returns live TotResults.
 * Fires onAllVoted when totalVotes >= totalPlayers.
 */
export function useVotes({
  roomCode,
  initialResults,
  totalPlayers,
  onAllVoted,
}: UseVotesOptions) {
  const [results, setResults] = useState<TotResults | null>(
    initialResults ?? null,
  )
  const [question, setQuestion] = useState<TotQuestion | null>(
    initialResults?.question ?? null,
  )
  // Track which question's votes we've already fired onAllVoted for
  const [firedForQuestionId, setFiredForQuestionId] = useState<string | null>(
    null,
  )

  // Sync when initialResults changes (e.g. question advanced)
  useEffect(() => {
    if (initialResults) {
      setResults(initialResults)
      setQuestion(initialResults.question)
    }
  }, [initialResults])

  useEffect(() => {
    if (!roomCode) return

    const channel = pusherClient.subscribe(`room-${roomCode}-game`)

    const handleVoteSubmitted = (data: { results: TotResults }) => {
      setResults(data.results)
      setQuestion(data.results.question)

      // Check if all non-host players have voted
      const totalVotes =
        (data.results.a_count ?? 0) + (data.results.b_count ?? 0)

      if (
        totalVotes >= totalPlayers &&
        data.results.question?.id !== firedForQuestionId
      ) {
        setFiredForQuestionId(data.results.question.id)
        onAllVoted()
      }
    }

    channel.bind('vote-submitted', handleVoteSubmitted)

    return () => {
      channel.unbind('vote-submitted', handleVoteSubmitted)
      pusherClient.unsubscribe(`room-${roomCode}-game`)
    }
  }, [roomCode, totalPlayers, onAllVoted, firedForQuestionId])

  return { results, question }
}
