import React, { useState, useEffect } from 'react'
import {
  Shield, Globe, Plus, CheckCircle2, XCircle, Search, RefreshCw,
  Building2, School, Trash2, Power
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import type { AllowedEmailDomain, University } from '@/types'

export default function DomainManagement() {
  const [domains, setDomains] = useState<AllowedEmailDomain[]>([])
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New domain form
  const [newDomain, setNewDomain] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [selectedUniId, setSelectedUniId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [domRes, uniRes] = await Promise.all([
        supabase.from('allowed_email_domains').select('*').order('created_at', { ascending: false }),
        supabase.from('universities').select('*').eq('is_active', true).order('name'),
      ])

      if (domRes.data) setDomains(domRes.data as AllowedEmailDomain[])
      if (uniRes.data) {
        setUniversities(uniRes.data as University[])
        if (uniRes.data.length > 0 && !selectedUniId) {
          setSelectedUniId(uniRes.data[0].id)
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching admin domain data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^@/, '')

    if (!cleanDomain) {
      setActionMsg({ type: 'error', text: 'Enter a valid domain name (e.g. ug.cusat.ac.in).' })
      return
    }

    if (!selectedUniId) {
      setActionMsg({ type: 'error', text: 'Select a parent university for this domain.' })
      return
    }

    setSubmitting(true)
    setActionMsg(null)

    try {
      const { data, error } = await supabase
        .from('allowed_email_domains')
        .insert({
          university_id: selectedUniId,
          domain: cleanDomain,
          label: newLabel.trim() || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setDomains(prev => [data as AllowedEmailDomain, ...prev])
      setNewDomain('')
      setNewLabel('')
      setActionMsg({ type: 'success', text: `Domain @${cleanDomain} added successfully.` })
    } catch (err: unknown) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to register domain.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleDomain = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('allowed_email_domains')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      setDomains(prev =>
        prev.map(d => (d.id === id ? { ...d, is_active: !currentStatus } : d))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const filteredDomains = domains.filter(d =>
    d.domain.toLowerCase().includes(search.toLowerCase()) ||
    (d.label && d.label.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campus Domain Governance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authorize institutional student email domains for CUSAT and partner universities.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadData} icon={<RefreshCw size={14} />}>
          Refresh List
        </Button>
      </div>

      {actionMsg && (
        <Alert variant={actionMsg.type === 'success' ? 'success' : 'danger'}>
          {actionMsg.text}
        </Alert>
      )}

      {/* Global Notice regarding Gmail & Institutional Domains */}
      <div className="p-4 rounded-xl bg-brand-950/40 border border-brand-500/30 flex items-start gap-3">
        <Globe size={20} className="text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-brand-300">Authentication Protocol:</strong> Standard <code className="text-brand-200">gmail.com</code> accounts are permitted system-wide as verified scholars. Institutional domains listed below grant additional campus affiliation badges and department group matching.
        </div>
      </div>

      {/* Grid: Add Domain Form + Domain List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Register New Domain */}
        <div className="lg:col-span-1">
          <Card className="p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus size={18} className="text-brand-400" />
              Add Campus Domain
            </h3>

            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  University / College
                </label>
                <select
                  value={selectedUniId}
                  onChange={e => setSelectedUniId(e.target.value)}
                  className="select w-full"
                >
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                  {universities.length === 0 && (
                    <option value="">Cochin University of Science and Technology (CUSAT)</option>
                  )}
                </select>
              </div>

              <Input
                id="admin-domain-input"
                label="Domain Name"
                placeholder="e.g. ug.cusat.ac.in"
                required
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                hint="Lowercase, without '@'. Subdomains supported."
              />

              <Input
                id="admin-domain-label"
                label="Domain Description / Tier"
                placeholder="e.g. CUSAT Undergraduate Students"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={submitting}
                icon={<Plus size={16} />}
              >
                Register Domain
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Existing Domains Table */}
        <div className="lg:col-span-2">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <School size={18} className="text-brand-400" />
                Active Authorized Domains ({filteredDomains.length})
              </h3>
              <div className="w-48">
                <Input
                  id="admin-domain-search"
                  placeholder="Filter domains..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  icon={<Search size={14} className="text-slate-500" />}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-elevated/70 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredDomains.map(d => (
                    <tr key={d.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-brand-300 font-semibold">
                        @{d.domain}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {d.label || 'Standard Student Domain'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {d.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleToggleDomain(d.id, d.is_active)}
                          icon={<Power size={13} />}
                        >
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredDomains.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">
                        {loading ? 'Loading registered domains...' : 'No matching domains found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
