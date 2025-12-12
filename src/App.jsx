import { useMemo, useState } from 'react';
import './index.css';

const copy = {
  nl: {
    title: 'Hypotheek Simulator',
    subtitle: 'Bereken direct uw maandelijkse aflossing, totale rente en volledige aflossingstabel.',
    cta: 'Bereken lening',
    language: 'Taal',
    amount: 'Leningsbedrag',
    rate: 'Rentevoet (% per jaar)',
    duration: 'Looptijd',
    type: 'Type rente',
    fixed: 'Vast',
    variable: 'Variabel',
    cap: 'CAP (max. rente)',
    floor: 'FLOOR (min. rente)',
    startDate: 'Startdatum lening',
    frequency: 'Betaalfrequentie',
    monthly: 'Maandelijks',
    yearly: 'Jaarlijks',
    results: 'Resultaten',
    monthlyPayment: 'Maandelijkse aflossing',
    totalInterest: 'Totale interest',
    totalPaid: 'Totale terugbetaling',
    worstCase: 'Maximale maandlast (CAP)',
    bestCase: 'Minimale maandlast (FLOOR)',
    months: 'Maanden',
    years: 'Jaren',
    balanceTrend: 'Saldo verloop',
    breakdown: 'Jaaroverzicht (kapitaal vs rente)',
    tableMonthly: 'Maandelijkse aflossingstabel',
    tableYearly: 'Jaarlijkse aflossingstabel',
    downloadCsv: 'Download CSV',
    validation: 'Controleer de rood gemarkeerde velden.',
    variableHint: 'CAP/FLOOR enkel bij variabele rente.',
    emptyState: 'Voer uw gegevens in en klik op “Bereken lening” om de tabellen te zien.',
  },
  en: {
    title: 'Mortgage Simulator',
    subtitle: 'Instant monthly payment, total interest, and a full amortization schedule.',
    cta: 'Calculate loan',
    language: 'Language',
    amount: 'Loan amount',
    rate: 'Interest rate (% yearly)',
    duration: 'Term',
    type: 'Rate type',
    fixed: 'Fixed',
    variable: 'Variable',
    cap: 'CAP (max rate)',
    floor: 'FLOOR (min rate)',
    startDate: 'Start date',
    frequency: 'Payment frequency',
    monthly: 'Monthly',
    yearly: 'Yearly',
    results: 'Results',
    monthlyPayment: 'Monthly payment',
    totalInterest: 'Total interest',
    totalPaid: 'Total repayment',
    worstCase: 'Max monthly (CAP)',
    bestCase: 'Min monthly (FLOOR)',
    months: 'Months',
    years: 'Years',
    balanceTrend: 'Balance trend',
    breakdown: 'Yearly breakdown (principal vs interest)',
    tableMonthly: 'Monthly amortization table',
    tableYearly: 'Yearly amortization table',
    downloadCsv: 'Download CSV',
    validation: 'Please correct the highlighted fields.',
    variableHint: 'CAP/FLOOR only for variable rates.',
    emptyState: 'Fill the form and hit “Calculate loan” to see the schedules.',
  },
};

const formatCurrency = (value, lang) =>
  new Intl.NumberFormat(lang === 'nl' ? 'nl-BE' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value) => `${value.toFixed(3)}%`;

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const monthlyRateFromAnnual = (annualRatePct) => (1 + annualRatePct / 100) ** (1 / 12) - 1;

const computePayment = (principal, periodRate, periods) => {
  if (periodRate === 0) return round2(principal / periods);
  const factor = (1 + periodRate) ** periods;
  return round2((principal * periodRate * factor) / (factor - 1));
};

const validate = (values, lang) => {
  const errors = {};
  const t = copy[lang];
  const durationMax = values.durationUnit === 'months' ? 600 : 50;
  if (values.amount < 1000 || values.amount > 5000000) errors.amount = `${t.amount} ≥ 1.000 en ≤ 5.000.000`;
  if (values.rate < 0 || values.rate > 20) errors.rate = `${t.rate} tussen 0% en 20%`;
  if (values.duration < 1 || values.duration > durationMax) errors.duration = `${t.duration} tussen 1 en ${durationMax}`;
  if (values.type === 'variable') {
    if (values.cap && values.cap < values.rate) errors.cap = 'CAP moet ≥ rente zijn';
    if (values.cap && values.cap > 30) errors.cap = 'CAP maximaal 30%';
    if (values.floor && values.floor > values.rate) errors.floor = 'FLOOR moet ≤ rente zijn';
    if (values.floor && values.floor < 0) errors.floor = 'FLOOR mag niet negatief zijn';
    if (values.cap && values.floor && values.cap < values.floor) errors.cap = 'CAP < FLOOR is niet toegestaan';
  }
  const today = new Date();
  const inputDate = new Date(values.startDate);
  if (Number.isNaN(inputDate.getTime()) || inputDate > today) errors.startDate = 'Gebruik een datum in het verleden of vandaag';
  return errors;
};

const calculateLoan = (values) => {
  const principal = Number(values.amount);
  const months = values.durationUnit === 'months' ? values.duration : values.duration * 12;
  const baseMonthlyRate = monthlyRateFromAnnual(values.rate);
  const monthlyPayment = computePayment(principal, baseMonthlyRate, months);

  const capRate = values.type === 'variable'
    ? monthlyRateFromAnnual(values.cap ?? values.rate)
    : baseMonthlyRate;
  const floorRate = values.type === 'variable'
    ? monthlyRateFromAnnual(values.floor ?? values.rate)
    : baseMonthlyRate;
  const maxMonthly = computePayment(principal, capRate, months);
  const minMonthly = computePayment(principal, floorRate, months);

  let balance = principal;
  const schedule = [];
  for (let i = 0; i < months; i += 1) {
    const periodRate = baseMonthlyRate;
    let interest = round2(balance * periodRate);
    let capital = round2(monthlyPayment - interest);
    let payment = monthlyPayment;
    if (i === months - 1) {
      // Adjust last payment to clear rounding residue.
      capital = round2(balance);
      interest = round2(balance * periodRate);
      payment = round2(capital + interest);
      balance = 0;
    } else {
      balance = round2(balance - capital);
    }
    schedule.push({
      index: i + 1,
      date: addMonths(values.startDate, i),
      rate: periodRate * 100,
      capital: capital,
      interest,
      payment,
      balance,
    });
  }

  const totalInterest = round2(schedule.reduce((sum, row) => sum + row.interest, 0));
  const totalPaid = round2(schedule.reduce((sum, row) => sum + row.payment, 0));
  const yearly = schedule.reduce((acc, row) => {
    const year = row.date.getFullYear();
    if (!acc[year]) {
      acc[year] = {
        year,
        capital: 0,
        interest: 0,
        payment: 0,
        endBalance: 0,
        endDate: row.date,
      };
    }
    acc[year].capital = round2(acc[year].capital + row.capital);
    acc[year].interest = round2(acc[year].interest + row.interest);
    acc[year].payment = round2(acc[year].payment + row.payment);
    acc[year].endBalance = row.balance;
    acc[year].endDate = row.date;
    return acc;
  }, {});

  return {
    monthlyPayment,
    totalInterest,
    totalPaid,
    schedule,
    yearly: Object.values(yearly).sort((a, b) => a.year - b.year),
    minMonthly,
    maxMonthly,
  };
};

const sparklinePath = (schedule) => {
  if (!schedule.length) return { d: '', width: 320, height: 80 };
  const width = 320;
  const height = 80;
  const balances = schedule.map((row) => row.balance);
  const maxBalance = Math.max(...balances, 1);
  const step = width / Math.max(1, balances.length - 1);
  const points = balances.map((balance, index) => {
    const x = index * step;
    const y = height - (balance / maxBalance) * height;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return { d: points.join(' '), width, height };
};

const Pill = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-3 py-1 text-sm transition ${
      active ? 'bg-accent text-white shadow-soft' : 'bg-white/80 text-ink hover:bg-white'
    }`}
  >
    {children}
  </button>
);

const DataCard = ({ label, value, hint }) => (
  <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
    {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
  </div>
);

const Table = ({ rows, lang }) => {
  const formatter = new Intl.DateTimeFormat(lang === 'nl' ? 'nl-BE' : 'en-GB');
  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Datum</th>
            <th className="px-4 py-3">Rente %</th>
            <th className="px-4 py-3">Kapitaal</th>
            <th className="px-4 py-3">Interest</th>
            <th className="px-4 py-3">Totaal</th>
            <th className="px-4 py-3">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.index} className="border-t border-slate-100 hover:bg-slate-50/70">
              <td className="px-4 py-2 text-slate-500">{row.index}</td>
              <td className="px-4 py-2">{formatter.format(row.date)}</td>
              <td className="px-4 py-2">{formatPercent(row.rate)}</td>
              <td className="px-4 py-2">{formatCurrency(row.capital, lang)}</td>
              <td className="px-4 py-2">{formatCurrency(row.interest, lang)}</td>
              <td className="px-4 py-2 font-medium">{formatCurrency(row.payment, lang)}</td>
              <td className="px-4 py-2">{formatCurrency(row.balance, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const YearlyTable = ({ rows, lang }) => {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Jaar</th>
            <th className="px-4 py-3">Kapitaal</th>
            <th className="px-4 py-3">Interest</th>
            <th className="px-4 py-3">Totaal betaald</th>
            <th className="px-4 py-3">Eindsaldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} className="border-t border-slate-100 hover:bg-slate-50/70">
              <td className="px-4 py-2">{row.year}</td>
              <td className="px-4 py-2">{formatCurrency(row.capital, lang)}</td>
              <td className="px-4 py-2">{formatCurrency(row.interest, lang)}</td>
              <td className="px-4 py-2 font-medium">{formatCurrency(row.payment, lang)}</td>
              <td className="px-4 py-2">{formatCurrency(row.endBalance, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const downloadCsv = (rows, lang, filename) => {
  const header = ['Index', 'Datum', 'Rente (%)', 'Kapitaal', 'Interest', 'Totaal', 'Saldo'];
  const body = rows
    .map((row) => [
      row.index,
      new Intl.DateTimeFormat(lang === 'nl' ? 'nl-BE' : 'en-GB').format(row.date),
      row.rate.toFixed(5),
      row.capital.toFixed(2),
      row.interest.toFixed(2),
      row.payment.toFixed(2),
      row.balance.toFixed(2),
    ].join(','))
    .join('\n');
  const csv = `${header.join(',')}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

function App() {
  const [lang, setLang] = useState('nl');
  const t = copy[lang];
  const [form, setForm] = useState({
    amount: 250000,
    rate: 3,
    duration: 25,
    durationUnit: 'years',
    type: 'fixed',
    cap: 5,
    floor: 1,
    startDate: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
  });
  const [errors, setErrors] = useState({});
  const [results, setResults] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['amount', 'rate', 'duration', 'cap', 'floor'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const validation = validate(form, lang);
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      setResults(calculateLoan(form));
    }
  };

  const sparkline = useMemo(() => (results ? sparklinePath(results.schedule) : null), [results]);

  const yearlyBreakdown = useMemo(() => {
    if (!results) return [];
    return results.yearly.map((row) => {
      const total = row.payment || 1;
      const interestShare = (row.interest / total) * 100;
      const capitalShare = (row.capital / total) * 100;
      return { ...row, interestShare, capitalShare };
    });
  }, [results]);

  return (
    <div className="min-h-screen px-4 pb-16 text-ink">
      <header className="mx-auto max-w-6xl pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Steefware</p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl">{t.title}</h1>
            <p className="mt-2 max-w-3xl text-lg text-slate-600">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/70 px-2 py-1 shadow-soft ring-1 ring-slate-100">
            <span className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.language}</span>
            <Pill active={lang === 'nl'} onClick={() => setLang('nl')}>
              NL
            </Pill>
            <Pill active={lang === 'en'} onClick={() => setLang('en')}>
              EN
            </Pill>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl bg-white/80 p-6 shadow-soft ring-1 ring-slate-100 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Input</h2>
              <p className="text-sm text-slate-500">{t.variableHint}</p>
            </div>
            <Pill active onClick={onSubmit}>{t.cta}</Pill>
          </div>
          <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium">
                {t.amount}
                <span className="text-xs text-slate-500">1.000 - 5.000.000</span>
              </label>
              <input
                name="amount"
                type="number"
                min="1000"
                max="5000000"
                step="1000"
                value={form.amount}
                onChange={onChange}
                className={`w-full rounded-xl border px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                  errors.amount ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {errors.amount ? <p className="text-xs text-red-500">{errors.amount}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium">
                {t.rate}
                <span className="text-xs text-slate-500">0 - 20%</span>
              </label>
              <input
                name="rate"
                type="number"
                step="0.01"
                min="0"
                max="20"
                value={form.rate}
                onChange={onChange}
                className={`w-full rounded-xl border px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                  errors.rate ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {errors.rate ? <p className="text-xs text-red-500">{errors.rate}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium">
                {t.duration}
                <span className="text-xs text-slate-500">
                  1 - {form.durationUnit === 'years' ? '50' : '600'} {form.durationUnit === 'years' ? (lang === 'nl' ? 'jaar' : 'years') : (lang === 'nl' ? 'maanden' : 'months')}
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  name="duration"
                  type="number"
                  min="1"
                  max={form.durationUnit === 'years' ? '50' : '600'}
                  value={form.duration}
                  onChange={onChange}
                  className={`w-full rounded-xl border px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                    errors.duration ? 'border-red-400' : 'border-slate-200'
                  }`}
                />
                <select
                  name="durationUnit"
                  value={form.durationUnit}
                  onChange={onChange}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="years">{t.years}</option>
                  <option value="months">{t.months}</option>
                </select>
              </div>
              {errors.duration ? <p className="text-xs text-red-500">{errors.duration}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.type}</label>
              <div className="flex gap-2">
                <Pill active={form.type === 'fixed'} onClick={() => setForm((p) => ({ ...p, type: 'fixed' }))}>
                  {t.fixed}
                </Pill>
                <Pill active={form.type === 'variable'} onClick={() => setForm((p) => ({ ...p, type: 'variable' }))}>
                  {t.variable}
                </Pill>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium">
                {t.cap}
                <span className="text-xs text-slate-500">Optioneel</span>
              </label>
              <input
                name="cap"
                type="number"
                step="0.1"
                min={form.rate}
                max="30"
                disabled={form.type === 'fixed'}
                value={form.type === 'fixed' ? '' : form.cap}
                onChange={onChange}
                className={`w-full rounded-xl border px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                  errors.cap ? 'border-red-400' : 'border-slate-200'
                } ${form.type === 'fixed' ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
              />
              {errors.cap ? <p className="text-xs text-red-500">{errors.cap}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium">
                {t.floor}
                <span className="text-xs text-slate-500">Optioneel</span>
              </label>
              <input
                name="floor"
                type="number"
                step="0.1"
                min="0"
                max={form.rate}
                disabled={form.type === 'fixed'}
                value={form.type === 'fixed' ? '' : form.floor}
                onChange={onChange}
                className={`w-full rounded-xl border px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                  errors.floor ? 'border-red-400' : 'border-slate-200'
                } ${form.type === 'fixed' ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
              />
              {errors.floor ? <p className="text-xs text-red-500">{errors.floor}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.startDate}</label>
              <input
                name="startDate"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={form.startDate}
                onChange={onChange}
                className={`w-full rounded-xl border px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                  errors.startDate ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {errors.startDate ? <p className="text-xs text-red-500">{errors.startDate}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.frequency}</label>
              <select
                name="frequency"
                value={form.frequency}
                onChange={onChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base shadow-inner transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="monthly">{t.monthly}</option>
                <option value="yearly">{t.yearly}</option>
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>{errors && Object.keys(errors).length ? t.validation : t.emptyState}</span>
              <button
                type="submit"
                className="rounded-full bg-ink px-4 py-2 text-white shadow-soft transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {t.cta}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl bg-white/80 p-6 shadow-soft ring-1 ring-slate-100 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-ink">{t.results}</h2>
            {results ? (
              <button
                type="button"
                onClick={() => downloadCsv(results.schedule, lang, 'aflossing-maandelijks.csv')}
                className="text-sm font-medium text-accent hover:text-accentDark"
              >
                {t.downloadCsv}
              </button>
            ) : null}
          </div>
          {results ? (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DataCard label={t.monthlyPayment} value={formatCurrency(results.monthlyPayment, lang)} />
                <DataCard label={t.totalInterest} value={formatCurrency(results.totalInterest, lang)} />
                <DataCard label={t.totalPaid} value={formatCurrency(results.totalPaid, lang)} />
                {form.type === 'variable' ? (
                  <>
                    <DataCard label={t.worstCase} value={formatCurrency(results.maxMonthly, lang)} />
                    <DataCard label={t.bestCase} value={formatCurrency(results.minMonthly, lang)} />
                  </>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.balanceTrend}</h3>
                    <span className="text-xs text-slate-500">
                      {formatCurrency(results.schedule[0].balance, lang)} → {formatCurrency(results.schedule.at(-1).balance, lang)}
                    </span>
                  </div>
                  <svg
                    className="mt-3 h-24 w-full"
                    viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
                    role="img"
                    aria-label={t.balanceTrend}
                  >
                    <path d={sparkline.d} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
                    <path
                      d={`${sparkline.d} L${sparkline.width},${sparkline.height} L0,${sparkline.height} Z`}
                      fill="url(#gradient)"
                      opacity="0.14"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop stopColor="#0ea5e9" stopOpacity="0.4" offset="0%" />
                        <stop stopColor="#0ea5e9" stopOpacity="0" offset="100%" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.breakdown}</h3>
                  <div className="mt-3 space-y-2">
                    {yearlyBreakdown.map((row) => (
                      <div key={row.year}>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>{row.year}</span>
                          <span>
                            {formatCurrency(row.capital, lang)} / {formatCurrency(row.interest, lang)}
                          </span>
                        </div>
                        <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="bg-accent" style={{ width: `${row.capitalShare}%` }} />
                          <div className="bg-indigo-400" style={{ width: `${row.interestShare}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-slate-500">{t.emptyState}</p>
          )}
        </section>
      </main>

      <section className="mx-auto mt-8 max-w-6xl space-y-6">
        {results ? (
          <>
            <div className="rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink">{t.tableMonthly}</h3>
                <div className="flex gap-2">
                  <Pill active={form.frequency === 'monthly'} onClick={() => setForm((p) => ({ ...p, frequency: 'monthly' }))}>
                    {t.monthly}
                  </Pill>
                  <Pill active={form.frequency === 'yearly'} onClick={() => setForm((p) => ({ ...p, frequency: 'yearly' }))}>
                    {t.yearly}
                  </Pill>
                </div>
              </div>
              {form.frequency === 'monthly' ? <Table rows={results.schedule} lang={lang} /> : <YearlyTable rows={results.yearly} lang={lang} />}
            </div>

            {form.frequency === 'monthly' ? (
              <div className="rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-slate-100">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-ink">{t.tableYearly}</h3>
                  <button
                    type="button"
                    className="text-sm font-medium text-accent hover:text-accentDark"
                    onClick={() => downloadCsv(results.yearly.map((row, idx) => ({
                      ...row,
                      index: idx + 1,
                      date: row.endDate,
                      rate: (form.rate),
                      capital: row.capital,
                      interest: row.interest,
                      payment: row.payment,
                      balance: row.endBalance,
                    })), lang, 'aflossing-jaar.csv')}
                  >
                    {t.downloadCsv}
                  </button>
                </div>
                <YearlyTable rows={results.yearly} lang={lang} />
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

export default App;
