"use client";

import { useEffect, useState } from "react";
import React from 'react';
import { api, UserListsResponse, ListStatus } from "@/lib/api";
import { Trash2, ArrowRightLeft, Film, BookOpen, AlertCircle } from "lucide-react";

export default function ListsPage() {
  const [lists, setLists] = useState<UserListsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLists() {
    try {
      setLoading(true);
      const data = await api.getMyLists();
      setLists(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar listas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLists();
  }, []);

  async function handleRemove(itemId: string) {
    if (!confirm("Tem certeza que deseja remover este item?")) return;
    try {
      await api.removeListItem(itemId);
      fetchLists(); // Recarrega as listas
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleMove(itemId: string, newStatus: ListStatus) {
    try {
      await api.moveListItem(itemId, newStatus);
      fetchLists(); // Recarrega as listas
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Componente interno para renderizar cada tabela
  const ListSection = ({ title, items, status }: { title: string, items: any[], status: ListStatus }) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="card stagger" style={{ marginBottom: '2rem' }}>
        <h3>{title}</h3>
        <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
          {items.length} {items.length === 1 ? 'item' : 'itens'} nesta lista.
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Adicionado em</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_id}>
                  <td style={{ fontWeight: 500 }}>{item.title}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text-soft)' }}>
                      {item.media_type === 'movie' || item.media_type === 'series' ? <Film size={12} /> : <BookOpen size={12} />}
                      {item.media_type.charAt(0).toUpperCase() + item.media_type.slice(1)}
                    </span>
                  </td>
                  <td className="mono">{new Date(item.added_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                      
                      {/* Select para mover o item rapidamente */}
                      <select 
                        style={{ width: 'auto', marginBottom: 0, padding: '0.3rem 1.8rem 0.3rem 0.6rem', fontSize: '0.8rem' }}
                        value={status}
                        onChange={(e) => handleMove(item.item_id, e.target.value as ListStatus)}
                      >
                        <option value="read">Lido</option>
                        <option value="watched">Assistido</option>
                        <option value="dropped">Abandonado</option>
                      </select>

                      <button 
                        className="btn-sm danger-soft" 
                        onClick={() => handleRemove(item.item_id)}
                        title="Remover da lista"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) return <div className="skeleton" style={{ height: '200px' }}></div>;

  const isEmpty = !lists || (lists.read.length === 0 && lists.watched.length === 0 && lists.dropped.length === 0);

  return (
    <>
      <div className="page-header stagger">
        <div>
          <div className="eyebrow">Acervo Pessoal</div>
          <h1>Minhas Listas</h1>
          <p>Gerencie seus filmes, séries e livros consumidos ou abandonados.</p>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {isEmpty ? (
        <div className="empty card stagger">
          <BookOpen size={32} />
          <h3 style={{ marginTop: '1rem' }}>Sua lista está vazia</h3>
          <p>Você ainda não adicionou nenhum título às suas listas.</p>
        </div>
      ) : (
        <>
          <ListSection title="Assistidos" items={lists.watched} status="watched" />
          <ListSection title="Lidos" items={lists.read} status="read" />
          <ListSection title="Abandonados" items={lists.dropped} status="dropped" />
        </>
      )}
    </>
  );
}