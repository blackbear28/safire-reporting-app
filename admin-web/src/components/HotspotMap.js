import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Chip, CircularProgress, Select, MenuItem, FormControl,
  InputLabel, Tooltip, Alert, LinearProgress,
} from '@mui/material';
import {
  LocalFireDepartment as FireIcon,
  TrendingUp as TrendIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend, LineChart, Line,
  ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Config ───────────────────────────────────────────────────────────────────
const BUILDINGS = [
  'Administration', 'Main Building', 'CAS Building',
  'Library Building', 'Student Center', 'Gymnasium', 'Cafeteria',
];

const CATEGORIES = ['academic', 'infrastructure', 'facilities', 'food', 'it', 'security', 'other'];

const CAT_COLOR = {
  academic: '#6366f1', infrastructure: '#f97316', food: '#22c55e',
  it: '#06b6d4', facilities: '#8b5cf6', security: '#ef4444', other: '#94a3b8',
};

const PRIORITY_WEIGHT = { critical: 4, high: 2, medium: 1, low: 0.5 };

const INTENSITY_COLOR = (score) => {
  if (score === 0)  return { bg: '#f8fafc', text: '#94a3b8', label: 'None' };
  if (score <= 5)   return { bg: '#dcfce7', text: '#15803d', label: 'Low' };
  if (score <= 12)  return { bg: '#fef3c7', text: '#b45309', label: 'Moderate' };
  if (score <= 22)  return { bg: '#ffedd5', text: '#c2410c', label: 'High' };
  return              { bg: '#fee2e2', text: '#b91c1c', label: 'Critical' };
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HotspotMap() {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reports'), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Filter by time range ───────────────────────────────────────────────────
  const filtered = reports.filter(r => {
    if (timeRange === 'all') return true;
    const ts = r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0;
    return ts >= Date.now() - parseInt(timeRange) * 86400000;
  });

  // ── Building × Category heatmap matrix ────────────────────────────────────
  const heatmapData = BUILDINGS.map(b => {
    const row = { building: b.replace(' Building', '').replace('Administration', 'Admin') };
    let total = 0;
    CATEGORIES.forEach(cat => {
      const score = filtered
        .filter(r => r.location?.building === b && r.category === cat)
        .reduce((s, r) => s + (PRIORITY_WEIGHT[r.priority] || 1), 0);
      row[cat] = score;
      total += score;
    });
    row.total = total;
    return row;
  });

  // ── Day-of-week frequency ──────────────────────────────────────────────────
  const dowData = DAYS.map((day, i) => ({
    day,
    count: filtered.filter(r => {
      const ts = r.createdAt?.toDate ? r.createdAt.toDate() : null;
      return ts && ts.getDay() === i;
    }).length,
  }));
  const peakDay = dowData.reduce((best, d) => d.count > best.count ? d : best, dowData[0]);

  // ── Weekly trend (last 8 weeks) ────────────────────────────────────────────
  const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
    const start = Date.now() - (8 - i) * 7 * 86400000;
    const end   = start + 7 * 86400000;
    const cnt   = reports.filter(r => {
      const ts = r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0;
      return ts >= start && ts < end;
    }).length;
    const d = new Date(start);
    return { week: `W${i + 1} ${d.getMonth() + 1}/${d.getDate()}`, count: cnt };
  });

  // ── Top hotspot ────────────────────────────────────────────────────────────
  const topBuilding = heatmapData.reduce((best, b) => b.total > best.total ? b : best, heatmapData[0]);
  const totalReports = filtered.length;
  const criticalCount = filtered.filter(r => r.priority === 'critical').length;

  // ── Radar chart data (building vs avg scores) ─────────────────────────────
  const radarData = heatmapData.map(b => ({
    building: b.building,
    score: b.total,
    predicted: Math.round(
      reports
        .filter(r => {
          const ts = r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0;
          const bName = BUILDINGS.find(n => n.replace(' Building','').replace('Administration','Admin') === b.building || n === b.building + ' Building');
          return r.location?.building === bName && ts >= Date.now() - 14 * 86400000;
        })
        .reduce((s, r) => s + (PRIORITY_WEIGHT[r.priority] || 1), 0) / 2
    ),
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FireIcon sx={{ color: '#ef4444' }} />
            Predictive Incident Hotspot Map
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time risk scoring + 7-day predictions by campus zone
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} label="Time Range" onChange={e => setTimeRange(e.target.value)}>
            <MenuItem value="7">Last 7 Days</MenuItem>
            <MenuItem value="30">Last 30 Days</MenuItem>
            <MenuItem value="90">Last 90 Days</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ── Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: <LocationIcon />, color: '#6366f1', bg: '#eef2ff', label: 'Total Reports', value: totalReports },
          { icon: <FireIcon />,     color: '#ef4444', bg: '#fee2e2', label: 'Hottest Zone',  value: topBuilding.building },
          { icon: <WarningIcon />,  color: '#f97316', bg: '#ffedd5', label: 'Critical Reports', value: criticalCount },
          { icon: <ScheduleIcon />, color: '#f59e0b', bg: '#fef3c7', label: 'Peak Day',      value: peakDay.day },
          { icon: <TrendIcon />,    color: '#22c55e', bg: '#dcfce7', label: 'Hottest Score', value: topBuilding.total },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ bgcolor: s.bg, color: s.color, borderRadius: 2, p: 0.5, display: 'flex' }}>
                    {s.icon}
                  </Box>
                </Box>
                <Typography variant="h6" fontWeight={800} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* ── Heatmap Table ── */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Building × Issue Type Heatmap
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Cell intensity = weighted risk score (critical×4, high×2, medium×1, low×0.5)
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'inherit' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontSize: 12, fontWeight: 600, width: 130 }}>
                      Building
                    </th>
                    {CATEGORIES.map(cat => (
                      <th key={cat} style={{ padding: '8px 8px', textAlign: 'center', fontSize: 11, color: CAT_COLOR[cat], fontWeight: 700, textTransform: 'capitalize' }}>
                        {cat}
                      </th>
                    ))}
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#1e2230', fontWeight: 700 }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapData
                    .sort((a, b) => b.total - a.total)
                    .map((row, i) => {
                      const intensity = INTENSITY_COLOR(row.total);
                      return (
                        <tr key={row.building}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, color: '#1e2230', borderTop: '1px solid #f1f5f9' }}>
                            {row.building}
                          </td>
                          {CATEGORIES.map(cat => {
                            const val = row[cat] || 0;
                            const cellStyle = INTENSITY_COLOR(val);
                            return (
                              <Tooltip key={cat} title={`${row.building} / ${cat}: score ${val}`} arrow>
                                <td style={{
                                  padding: '8px',
                                  textAlign: 'center',
                                  borderTop: '1px solid #f1f5f9',
                                  backgroundColor: val > 0 ? cellStyle.bg : 'transparent',
                                  transition: 'background 0.2s',
                                  cursor: 'default',
                                }}>
                                  <Typography variant="caption" fontWeight={700} sx={{ color: val > 0 ? cellStyle.text : '#cbd5e1' }}>
                                    {val > 0 ? val : '—'}
                                  </Typography>
                                </td>
                              </Tooltip>
                            );
                          })}
                          <td style={{ padding: '8px 12px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                            <Chip
                              label={row.total}
                              size="small"
                              sx={{
                                bgcolor: intensity.bg,
                                color: intensity.text,
                                fontWeight: 800,
                                fontSize: 12,
                                height: 24,
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>

        {/* ── Day-of-week Bar Chart ── */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Reports by Day of Week
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Predicts which days have highest incident frequency
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dowData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartTooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Reports">
                  {dowData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.day === peakDay.day ? '#ef4444' : '#6366f1'}
                      fillOpacity={entry.day === peakDay.day ? 1 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
              Peak incident day: <strong>{peakDay.day}</strong> with <strong>{peakDay.count}</strong> reports
            </Alert>
          </Paper>
        </Grid>

        {/* ── Weekly Trend ── */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              8-Week Incident Trend
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Rising trend indicates emerging hotspot clusters
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartTooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Reports"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* ── Radar / Spider chart ── */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Zone Risk Radar
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Current score vs predicted next-7-day score per zone
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="building" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name="Current Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                <Radar name="Predicted" dataKey="predicted" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} strokeDasharray="4 2" />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* ── Prediction Rankings ── */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              🔮 Predicted Hotspots — Next 7 Days
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Based on 14-day rolling window; score = half of recent 14d weighted total
            </Typography>
            {radarData
              .sort((a, b) => b.predicted - a.predicted)
              .map((item, rank) => {
                const style = INTENSITY_COLOR(item.predicted);
                const max   = Math.max(...radarData.map(r => r.predicted)) || 1;
                return (
                  <Box key={item.building} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        #{rank + 1} {item.building}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={style.label}
                          size="small"
                          sx={{ bgcolor: style.bg, color: style.text, fontWeight: 700, height: 20, fontSize: 10 }}
                        />
                        <Typography variant="body2" fontWeight={800} sx={{ color: style.text, minWidth: 28 }}>
                          ~{item.predicted}
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={max > 0 ? (item.predicted / max) * 100 : 0}
                      sx={{
                        height: 7,
                        borderRadius: 4,
                        bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': { bgcolor: style.text, borderRadius: 4 },
                      }}
                    />
                  </Box>
                );
              })}
            <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<WarningIcon fontSize="small" />}>
              Zones predicted &gt;10 require proactive admin attention.
            </Alert>
          </Paper>
        </Grid>

        {/* ── Category-level breakdown ── */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Issue Type Distribution Across Zones
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={heatmapData.sort((a, b) => b.total - a.total)}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="building" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {CATEGORIES.map(cat => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={CAT_COLOR[cat]}
                    name={cat.charAt(0).toUpperCase() + cat.slice(1)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
