"use client";

/**
 * frontend/components/ContentForm.tsx
 *
 * Form for creating a new catalog item.
 * Displays specific, highlighted validation errors from the API:
 * - duplicate content (400)
 * - invalid duration format (400 / 422)
 * - insufficient permissions (403)
 */

import { useState } from "react";
import { ApiError, api, ContentCreatePayload } from "../lib/api";

interface ContentFormProps {
  onSuccess?: (title: string) => void;
}

const emptyForm: ContentCreatePayload = {
  title: "",
  genre: "",
  release_year: new Date().getFullYear(),
  duration: "",
};

interface FieldErrors {
  title?: string;
  genre?: string;
  release_year?: string;
  duration?: string;
  _global?: string;
}

export function ContentForm({ onSuccess }: ContentFormProps) {
  const [form, setForm] = useState<ContentCreatePayload>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  function set(field: keyof ContentCreatePayload, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear per-field error on change
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function clientValidate(): FieldErrors {
    const e: FieldErrors = {};
    if (!form.title.trim()) e.title = "Título é obrigatório.";
    if (!form.genre.trim()) e.genre = "Gênero é obrigatório.";
    if (!form.release_year || form.release_year < 1888)
      e.release_year = "Ano de lançamento inválido.";
    if (!form.duration.trim()) {
      e.duration = "Duração é obrigatória.";
    } else if (!/^\s*[1-9]\d*\s*min\s*$/i.test(form.duration)) {
      e.duration = "Formato inválido. Use '<número positivo> min', ex: '120 min'.";
    }
    return e;
  }

  async function handleSubmit() {
    setSuccess(null);
    const clientErrors = clientValidate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      // Utilizing the new unified API object. Token is handled automatically!
      await api.createContent(form);
      setSuccess(`"${form.title}" cadastrado com sucesso!`);
      setForm(emptyForm);
      onSuccess?.(form.title);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // The unified ApiError uses .message instead of .detail
        const detail = err.message ?? "";
        
        if (err.status === 403) {
          setErrors({
            _global:
              "Permissão insuficiente. Apenas moderadores podem cadastrar conteúdo.",
          });
        } else if (
          err.status === 400 &&
          detail.toLowerCase().includes("duplicado")
        ) {
          setErrors({
            title: `Conteúdo duplicado: já existe "${form.title}" (${form.release_year}).`,
          });
        } else if (err.status === 400 || err.status === 422) {
          // Could be duration or other validation
          if (
            detail.toLowerCase().includes("dura") ||
            detail.toLowerCase().includes("formato")
          ) {
            setErrors({ duration: detail });
          } else {
            setErrors({ _global: detail });
          }
        } else {
          setErrors({ _global: `Erro inesperado (${err.status}): ${detail}` });
        }
      } else {
        setErrors({ _global: "Falha na conexão com o servidor." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="content-form">
      <h2 className="content-form__title">Cadastrar Novo Conteúdo</h2>

      {success && (
        <div className="content-form__success" role="status" aria-live="polite">
          ✓ {success}
        </div>
      )}

      {errors._global && (
        <div
          className="content-form__error content-form__error--global"
          role="alert"
        >
          {errors._global}
        </div>
      )}

      <div className="form-field">
        <label htmlFor="cf-title">Título *</label>
        <input
          id="cf-title"
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "cf-title-err" : undefined}
          placeholder="ex: Matrix"
        />
        {errors.title && (
          <span id="cf-title-err" className="form-field__error" role="alert">
            {errors.title}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="cf-genre">Gênero *</label>
        <input
          id="cf-genre"
          type="text"
          value={form.genre}
          onChange={(e) => set("genre", e.target.value)}
          aria-invalid={!!errors.genre}
          aria-describedby={errors.genre ? "cf-genre-err" : undefined}
          placeholder="ex: ficção científica"
        />
        {errors.genre && (
          <span id="cf-genre-err" className="form-field__error" role="alert">
            {errors.genre}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="cf-year">Ano de lançamento *</label>
        <input
          id="cf-year"
          type="number"
          value={form.release_year}
          onChange={(e) => set("release_year", parseInt(e.target.value, 10))}
          aria-invalid={!!errors.release_year}
          aria-describedby={errors.release_year ? "cf-year-err" : undefined}
          min={1888}
          max={new Date().getFullYear() + 5}
        />
        {errors.release_year && (
          <span id="cf-year-err" className="form-field__error" role="alert">
            {errors.release_year}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="cf-duration">Duração *</label>
        <input
          id="cf-duration"
          type="text"
          value={form.duration}
          onChange={(e) => set("duration", e.target.value)}
          aria-invalid={!!errors.duration}
          aria-describedby={errors.duration ? "cf-duration-err" : undefined}
          placeholder="ex: 120 min"
        />
        {errors.duration && (
          <span id="cf-duration-err" className="form-field__error" role="alert">
            {errors.duration}
          </span>
        )}
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}