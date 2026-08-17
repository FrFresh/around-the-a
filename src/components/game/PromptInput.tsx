"use client";

import { useState } from "react";
import { PixelButton } from "./PixelButton.tsx";

interface PromptInputProps {
  label: string;
  placeholder: string;
  attempt: number;
  onSubmit(value: string): void;
}

export function PromptInput({
  label,
  placeholder,
  attempt,
  onSubmit,
}: PromptInputProps) {
  const [value, setValue] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = value.trim();
    if (!question) return;
    onSubmit(question);
    setValue("");
  }

  return (
    <form className="prompt-input" onSubmit={submit}>
      <label htmlFor="player-question">{label}</label>
      <textarea
        id="player-question"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        maxLength={420}
        rows={4}
        autoFocus
      />
      <div>
        <small>ATTEMPT {attempt + 1} · YOUR WORDS</small>
        <PixelButton type="submit" disabled={!value.trim()}>
          ASK MAYA
        </PixelButton>
      </div>
    </form>
  );
}
