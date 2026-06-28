'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, Upload, ImageIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getTopicImageUrl } from '@/lib/supabase/storage'
import type { MoleTopic, MoleTopicInput } from '../types'

interface TopicBankManagerProps {
  onBack: () => void
}

export function TopicBankManager({ onBack }: TopicBankManagerProps) {
  const [topics, setTopics] = useState<MoleTopic[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [title, setTitle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [moleArg1, setMoleArg1] = useState('')
  const [moleArg2, setMoleArg2] = useState('')
  const [moleArg3, setMoleArg3] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [correctChoice, setCorrectChoice] = useState<'a' | 'b'>('a')
  const [correctAnswerWhy, setCorrectAnswerWhy] = useState('')

  // Edit state
  const [editingTopic, setEditingTopic] = useState<MoleTopic | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [editUploading, setEditUploading] = useState(false)

  // File input refs
  const createFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchTopics() {
      try {
        const res = await fetch('/api/games/mole-hunt/topics')
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Failed to load topics')
        if (!cancelled) setTopics(data.topics || [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load topics')
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    fetchTopics()
    return () => {
      cancelled = true
    }
  }, [])

  function resetCreateForm() {
    setTitle('')
    setBlurb('')
    setMoleArg1('')
    setMoleArg2('')
    setMoleArg3('')
    setImageFile(null)
    setImagePreview(null)
    setUploadedPath(null)
    setOptionA('')
    setOptionB('')
    setCorrectChoice('a')
    setCorrectAnswerWhy('')
    setError(null)
  }

  // ── File upload helpers ──────────────────────────────────────────
  function handleFileSelect(
    file: File | undefined,
    setPreview: (url: string | null) => void,
  ) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  async function uploadImage(
    file: File,
  ): Promise<string> {
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `mole-topics/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from('high6-play')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error
    return path
  }

  async function handleCreate() {
    const a = optionA.trim()
    const b = optionB.trim()
    const t = title.trim()
    const bl = blurb.trim()

    if (!t || !bl || !a || !b) {
      setError('Title, blurb, and both options are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Upload image first if selected
      let imagePath = uploadedPath
      if (imageFile && !imagePath) {
        setUploadingImage(true)
        imagePath = await uploadImage(imageFile)
        setUploadedPath(imagePath)
        setUploadingImage(false)
      }

      const input: MoleTopicInput = {
        title: t,
        blurb: bl,
        option_a: a,
        option_b: b,
        correct_choice: correctChoice,
      }
      if (correctAnswerWhy.trim()) {
        input.correct_answer_why = correctAnswerWhy.trim()
      }
      if (imagePath) {
        input.image_url = imagePath
      }
      if (moleArg1.trim()) {
        input.mole_argument_1 = moleArg1.trim()
      }
      if (moleArg2.trim()) {
        input.mole_argument_2 = moleArg2.trim()
      }
      if (moleArg3.trim()) {
        input.mole_argument_3 = moleArg3.trim()
      }

      const res = await fetch('/api/games/mole-hunt/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create topic')

      setTopics((prev) => [data.topic, ...prev])
      resetCreateForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic')
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  async function handleUpdate() {
    if (!editingTopic) return

    setSaving(true)
    setError(null)

    try {
      // Upload new image if selected
      let imagePath = editingTopic.image_url
      if (editImageFile) {
        setEditUploading(true)
        imagePath = await uploadImage(editImageFile)
        setEditUploading(false)
      }

      const input: MoleTopicInput = {
        title: editingTopic.title,
        blurb: editingTopic.blurb,
        option_a: editingTopic.option_a,
        option_b: editingTopic.option_b,
        correct_choice: editingTopic.correct_choice,
      }
      if (editingTopic.correct_answer_why?.trim()) {
        input.correct_answer_why = editingTopic.correct_answer_why.trim()
      }
      if (imagePath) {
        input.image_url = imagePath
      }
      if (editingTopic.mole_argument_1?.trim()) {
        input.mole_argument_1 = editingTopic.mole_argument_1.trim()
      }
      if (editingTopic.mole_argument_2?.trim()) {
        input.mole_argument_2 = editingTopic.mole_argument_2.trim()
      }
      if (editingTopic.mole_argument_3?.trim()) {
        input.mole_argument_3 = editingTopic.mole_argument_3.trim()
      }

      const res = await fetch(
        `/api/games/mole-hunt/topics/${editingTopic.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update topic')

      setTopics((prev) =>
        prev.map((t) => (t.id === data.topic.id ? data.topic : t)),
      )
      setEditingTopic(null)
      setEditImageFile(null)
      setEditImagePreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update topic')
    } finally {
      setSaving(false)
      setEditUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/games/mole-hunt/topics/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete topic')
      }

      setTopics((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete topic')
    } finally {
      setDeletingId(null)
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading topic bank…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <span className="text-2xl font-bold text-amber-400">🕳️</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Topic Bank</h1>
        <p className="text-sm text-muted-foreground">
          Create, edit, and delete Mole Hunt topics. Topics are saved to your
          personal bank.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Create Topic Form */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4 text-amber-400" />
            Add a New Topic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="topic-title" className="text-xs">
              Title
            </Label>
            <Input
              id="topic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Atacama Desert"
              maxLength={120}
              disabled={saving}
              className="border-amber-500/30 bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-blurb" className="text-xs">
              Information Blurb
            </Label>
            <Textarea
              id="topic-blurb"
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="2–3 sentences of ambiguous context…"
              maxLength={500}
              disabled={saving}
              rows={4}
              className="border-amber-500/30 bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-arg1" className="text-xs text-muted-foreground">
              Persuasion Argument 1 <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="topic-arg1"
              value={moleArg1}
              onChange={(e) => setMoleArg1(e.target.value)}
              placeholder="e.g. Argue that the desert spans both countries…"
              maxLength={300}
              disabled={saving}
              rows={3}
              className="bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Shown exclusively to Mole 1 during the discuss phase.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-arg2" className="text-xs text-muted-foreground">
              Persuasion Argument 2 <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="topic-arg2"
              value={moleArg2}
              onChange={(e) => setMoleArg2(e.target.value)}
              placeholder="e.g. Point out the disputed border history…"
              maxLength={300}
              disabled={saving}
              rows={3}
              className="bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Shown exclusively to Mole 2 during the discuss phase.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-arg3" className="text-xs text-muted-foreground">
              Persuasion Argument 3 <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="topic-arg3"
              value={moleArg3}
              onChange={(e) => setMoleArg3(e.target.value)}
              placeholder="e.g. Mention how the climate varies by region…"
              maxLength={300}
              disabled={saving}
              rows={3}
              className="bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Shown exclusively to Mole 3 during the discuss phase.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Topic Image <span className="text-muted-foreground">(optional)</span>
            </Label>
            {/* Hidden file input */}
            <input
              ref={createFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setImageFile(file)
                  setUploadedPath(null)
                  handleFileSelect(file, setImagePreview)
                }
              }}
              disabled={saving || uploadingImage}
            />
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-lg border border-border/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                    setUploadedPath(null)
                    if (createFileRef.current) createFileRef.current.value = ''
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80 cursor-pointer"
                  aria-label="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => createFileRef.current?.click()}
                disabled={saving || uploadingImage}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/30 bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-amber-500/30 hover:text-amber-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload Image
                  </>
                )}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="topic-option-a" className="text-xs text-blue-400">
                Option A
              </Label>
              <Input
                id="topic-option-a"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="e.g. Chile"
                maxLength={120}
                disabled={saving}
                className="border-blue-500/30 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic-option-b" className="text-xs text-violet-400">
                Option B
              </Label>
              <Input
                id="topic-option-b"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="e.g. Peru"
                maxLength={120}
                disabled={saving}
                className="border-violet-500/30 bg-background"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-correct" className="text-xs">
              Correct Answer
            </Label>
            <select
              id="topic-correct"
              value={correctChoice}
              onChange={(e) => setCorrectChoice(e.target.value as 'a' | 'b')}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-border/30 bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-correct-why" className="text-xs text-muted-foreground">
              Why this is correct <span className="text-muted-foreground">(host only)</span>
            </Label>
            <Textarea
              id="topic-correct-why"
              value={correctAnswerWhy}
              onChange={(e) => setCorrectAnswerWhy(e.target.value)}
              placeholder={`Cite the specific line from the blurb that proves the correct answer — e.g. "The blurb says X, which means Y."`}
              maxLength={500}
              disabled={saving}
              rows={3}
              className="bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Players never see this. Used by the host during the reveal.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreate}
            disabled={
              saving || !title.trim() || !blurb.trim() || !optionA.trim() || !optionB.trim()
            }
            className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Add Topic
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Topic List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Your Topics
          </p>
          <Badge variant="secondary">{topics.length}</Badge>
        </div>

        {topics.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No topics yet. Add your first topic above!
          </p>
        ) : (
          <div className="max-h-[40vh] space-y-1 overflow-y-auto rounded-lg border border-border/30 bg-card/50 p-1">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                {/* Thumbnail */}
                {topic.image_url && (
                  <div className="mt-0.5 size-10 shrink-0 overflow-hidden rounded-md border border-border/20 bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getTopicImageUrl(topic.image_url) ?? undefined}
                      alt={topic.title}
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{topic.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {topic.blurb}
                  </p>
                  {topic.mole_argument_1 && (
                    <p className="mt-0.5 truncate text-[10px] text-amber-400/60">
                      Arg 1: {topic.mole_argument_1}
                    </p>
                  )}
                  {topic.mole_argument_2 && (
                    <p className="truncate text-[10px] text-amber-400/60">
                      Arg 2: {topic.mole_argument_2}
                    </p>
                  )}
                  {topic.mole_argument_3 && (
                    <p className="truncate text-[10px] text-amber-400/60">
                      Arg 3: {topic.mole_argument_3}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="font-medium text-blue-400">
                      {topic.option_a}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium text-violet-400">
                      {topic.option_b}
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-1 text-[10px]"
                    >
                      Correct: {topic.correct_choice.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingTopic(topic)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                    aria-label="Edit topic"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(topic.id)}
                    disabled={deletingId === topic.id}
                    className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Delete topic"
                  >
                    {deletingId === topic.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back */}
      <Button variant="outline" size="lg" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Back to Room Config
      </Button>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingTopic}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTopic(null)
            setEditImageFile(null)
            setEditImagePreview(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
          </DialogHeader>
          {editingTopic && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-xs">
                  Title
                </Label>
                <Input
                  id="edit-title"
                  value={editingTopic.title}
                  onChange={(e) =>
                    setEditingTopic({ ...editingTopic, title: e.target.value })
                  }
                  maxLength={120}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-blurb" className="text-xs">
                  Blurb
                </Label>
                <Textarea
                  id="edit-blurb"
                  value={editingTopic.blurb}
                  onChange={(e) =>
                    setEditingTopic({ ...editingTopic, blurb: e.target.value })
                  }
                  maxLength={500}
                  disabled={saving}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-arg1" className="text-xs text-muted-foreground">
                  Persuasion Argument 1 (optional)
                </Label>
                <Textarea
                  id="edit-arg1"
                  value={editingTopic.mole_argument_1 ?? ''}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      mole_argument_1: e.target.value || null,
                    })
                  }
                  placeholder="e.g. Argue that the desert spans both countries…"
                  maxLength={300}
                  disabled={saving || editUploading}
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground">
                  Shown exclusively to Mole 1 during the discuss phase.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-arg2" className="text-xs text-muted-foreground">
                  Persuasion Argument 2 (optional)
                </Label>
                <Textarea
                  id="edit-arg2"
                  value={editingTopic.mole_argument_2 ?? ''}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      mole_argument_2: e.target.value || null,
                    })
                  }
                  placeholder="e.g. Point out the disputed border history…"
                  maxLength={300}
                  disabled={saving || editUploading}
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground">
                  Shown exclusively to Mole 2 during the discuss phase.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-arg3" className="text-xs text-muted-foreground">
                  Persuasion Argument 3 (optional)
                </Label>
                <Textarea
                  id="edit-arg3"
                  value={editingTopic.mole_argument_3 ?? ''}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      mole_argument_3: e.target.value || null,
                    })
                  }
                  placeholder="e.g. Mention how the climate varies by region…"
                  maxLength={300}
                  disabled={saving || editUploading}
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground">
                  Shown exclusively to Mole 3 during the discuss phase.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Topic Image (optional)
                </Label>
                {/* Hidden file input */}
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setEditImageFile(file)
                      handleFileSelect(file, setEditImagePreview)
                    }
                  }}
                  disabled={saving || editUploading}
                />
                {editImagePreview ? (
                  <div className="relative overflow-hidden rounded-lg border border-border/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editImagePreview}
                      alt="New image preview"
                      className="h-32 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageFile(null)
                        setEditImagePreview(null)
                        if (editFileRef.current) editFileRef.current.value = ''
                      }}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80 cursor-pointer"
                      aria-label="Remove new image"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : editingTopic.image_url ? (
                  <div className="relative overflow-hidden rounded-lg border border-border/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getTopicImageUrl(editingTopic.image_url) ?? undefined}
                      alt="Current topic image"
                      className="h-32 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTopic({
                          ...editingTopic,
                          image_url: null,
                        })
                      }
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80 cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editFileRef.current?.click()}
                    disabled={saving || editUploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/30 bg-background px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-border/50 hover:text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editUploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="size-4" />
                        {editingTopic.image_url
                          ? 'Change Image'
                          : 'Upload Image'}
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-option-a" className="text-xs text-blue-400">
                    Option A
                  </Label>
                  <Input
                    id="edit-option-a"
                    value={editingTopic.option_a}
                    onChange={(e) =>
                      setEditingTopic({
                        ...editingTopic,
                        option_a: e.target.value,
                      })
                    }
                    maxLength={120}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-option-b" className="text-xs text-violet-400">
                    Option B
                  </Label>
                  <Input
                    id="edit-option-b"
                    value={editingTopic.option_b}
                    onChange={(e) =>
                      setEditingTopic({
                        ...editingTopic,
                        option_b: e.target.value,
                      })
                    }
                    maxLength={120}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-correct" className="text-xs">
                  Correct Answer
                </Label>
                <select
                  id="edit-correct"
                  value={editingTopic.correct_choice}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      correct_choice: e.target.value as 'a' | 'b',
                    })
                  }
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-border/30 bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="a">Option A</option>
                  <option value="b">Option B</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-correct-why" className="text-xs text-muted-foreground">
                  Why this is correct <span className="text-muted-foreground">(host only)</span>
                </Label>
                <Textarea
                  id="edit-correct-why"
                  value={editingTopic.correct_answer_why ?? ''}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      correct_answer_why: e.target.value || null,
                    })
                  }
                  placeholder={`Cite the specific line from the blurb that proves the correct answer — e.g. "The blurb says X, which means Y."`}
                  maxLength={500}
                  disabled={saving || editUploading}
                  rows={3}
                />
                <p className="text-[10px] text-muted-foreground">
                  Players never see this. Used by the host during the reveal.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingTopic(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUpdate}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
