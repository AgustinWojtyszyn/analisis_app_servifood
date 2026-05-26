import React from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis
} from 'recharts';

function EmptyState({ text }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
      {text}
    </Box>
  );
}

function SummaryCards({ resumenHallazgos, textPrimary, textSecondary }) {
  return (
    <Grid container spacing={2.25} sx={{ mb: 0.5 }}>
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 800, mb: 1.5, color: textPrimary, fontSize: 17 }}>Resumen de hallazgos</Typography>
            <Grid container spacing={1.5}>
              {resumenHallazgos.map((item) => (
                <Grid item xs={6} sm={4} md={2.4} key={item.name}>
                  <Box sx={{ borderRadius: 2, p: 1.5, border: '1px solid', borderColor: 'divider', backgroundColor: 'rgba(248,250,252,0.9)' }}>
                    <Typography variant="body2" sx={{ color: textSecondary, fontWeight: 700 }}>{item.name}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: textPrimary }}>{item.value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function AreaChart({ data, textPrimary, textMuted, palette, tooltipStyle, abbreviateAreaLabel }) {
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 1.75 }}>
          <Typography sx={{ fontWeight: 900, mb: 2, color: textPrimary, fontSize: 17 }}>Desvíos por área</Typography>
          <Box sx={{ width: '100%', height: data.length === 0 ? 165 : 360 }}>
            {data.length === 0 ? (
              <EmptyState text="No hay datos por área" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }} barCategoryGap={16}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 700, fill: textMuted }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13, fontWeight: 700, fill: textPrimary }} tickFormatter={(value) => abbreviateAreaLabel(value)} />
                  <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} labelFormatter={(label) => String(label || '')} />
                  <Bar dataKey="value" radius={[0, 7, 7, 0]}>
                    {data.map((entry, idx) => (
                      <Cell key={entry.name} fill={palette[idx % palette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

function CategoryPieChart({ data, textPrimary, pieColors, tooltipStyle }) {
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 1.75 }}>
          <Typography sx={{ fontWeight: 900, mb: 2, color: textPrimary, fontSize: 17 }}>Desvíos por categoría</Typography>
          <Box sx={{ width: '100%', height: data.length === 0 ? 165 : 260 }}>
            {data.length === 0 ? (
              <EmptyState text="No hay datos por categoría" />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1.5 }}>
                <Box sx={{ flex: '0 0 54%', minWidth: 0, height: '100%' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" outerRadius={74} label={({ percent = 0 }) => (percent && percent >= 0.04 ? `${Math.round(percent * 100)}%` : '')} labelLine={false}>
                        {data.map((entry, idx) => (
                          <Cell key={entry.name} fill={pieColors[idx % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {data.map((item, idx) => (
                    <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '999px', backgroundColor: pieColors[idx % pieColors.length], flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 800, color: textPrimary, minWidth: 0, fontSize: 13.5 }}>
                        {item.name}: {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

function ScopePieChart({ data, textPrimary, pieColors, tooltipStyle }) {
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 1.75 }}>
          <Typography sx={{ fontWeight: 900, mb: 2, color: textPrimary, fontSize: 17 }}>Desvíos internos vs externos</Typography>
          <Box sx={{ width: '100%', height: data.length === 0 ? 165 : 260 }}>
            {data.length === 0 ? (
              <EmptyState text="No hay datos de interno/externo" />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1.5 }}>
                <Box sx={{ flex: '0 0 54%', minWidth: 0, height: '100%' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" outerRadius={74} label={({ percent = 0 }) => (percent ? `${Math.round(percent * 100)}%` : '')} labelLine={false}>
                        {data.map((entry, idx) => (
                          <Cell key={entry.name} fill={pieColors[idx % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {data.map((item, idx) => (
                    <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '999px', backgroundColor: pieColors[idx % pieColors.length], flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 800, color: textPrimary, minWidth: 0, fontSize: 13.5 }}>
                        {item.name}: {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

function IsoNormaPieChart({ data, textPrimary, pieColors, tooltipStyle }) {
  const total = data.reduce((acc, item) => acc + Number(item.value || 0), 0);
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 1.75 }}>
          <Typography sx={{ fontWeight: 900, mb: 2, color: textPrimary, fontSize: 17 }}>Distribución por Norma ISO</Typography>
          <Box sx={{ width: '100%', height: data.length === 0 ? 165 : 290 }}>
            {data.length === 0 ? (
              <EmptyState text="No hay datos de norma ISO" />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={92}
                    label={({ percent = 0 }) => (percent ? `${Math.round(percent * 100)}%` : '')}
                    labelLine={false}
                  >
                    {data.map((entry, idx) => (
                      <Cell key={entry.name} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tooltipStyle()}
                    formatter={(value, _name, props) => [value, String(props?.payload?.name || 'Norma')]}
                  />
                  <Legend
                    formatter={(value, _entry, index) => {
                      const item = data[index] || null;
                      const qty = Number(item?.value || 0);
                      const pct = total > 0 ? Math.round((qty / total) * 100) : 0;
                      return `${value} (${pct}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

function CategoryBarChart({ data, textPrimary, textMuted, tooltipStyle }) {
  return (
    <Grid item xs={12} md={6}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 1.75 }}>
          <Typography sx={{ fontWeight: 900, mb: 2, color: textPrimary, fontSize: 17 }}>Desvíos por categoría (barras)</Typography>
          <Box sx={{ width: '100%', height: data.length === 0 ? 165 : 340 }}>
            {data.length === 0 ? (
              <EmptyState text="No hay datos por categoría" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 6, right: 10, left: 6, bottom: 8 }} barCategoryGap={18}>
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 13, fontWeight: 800, fill: textPrimary }} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 700, fill: textMuted }} />
                  <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} labelFormatter={(label) => String(label || '')} />
                  <Bar dataKey="value" fill="#1d4ed8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

function IsoChart({ data, textPrimary, textMuted, palette, tooltipStyle, IsoYAxisTick, totalRecords }) {
  return (
    <Grid item xs={12}>
      <Card>
        <CardContent sx={{ p: 1.75 }}>
          <Typography sx={{ fontWeight: 900, mb: 2, color: textPrimary, fontSize: 17 }}>Vinculación con requisitos ISO 22000</Typography>
          <Box sx={{ width: '100%', height: data.length === 0 ? 170 : 640 }}>
            {data.length === 0 ? (
              <EmptyState text="No hay datos ISO" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 18, bottom: 8 }} barCategoryGap={24}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 700, fill: textMuted }} />
                  <YAxis type="category" dataKey="name" width={280} tick={<IsoYAxisTick />} />
                  <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} labelFormatter={(label) => String(label || '')} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {data.map((entry, idx) => (
                      <Cell key={entry.name} fill={palette[idx % palette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
          <Typography variant="body2" sx={{ mt: 1, color: textMuted, fontWeight: 700, fontSize: 13.5 }}>
            Total analizado: {totalRecords}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

export function ChartsSections({
  data,
  textPrimary,
  textMuted,
  textSecondary,
  palette,
  pieColors,
  tooltipStyle,
  abbreviateAreaLabel,
  IsoYAxisTick
}) {
  return (
    <Box>
      <SummaryCards resumenHallazgos={data.resumenHallazgos} textPrimary={textPrimary} textSecondary={textSecondary} />
      <Grid container spacing={2.25}>
        <AreaChart
          data={data.desviosPorArea}
          textPrimary={textPrimary}
          textMuted={textMuted}
          palette={palette}
          tooltipStyle={tooltipStyle}
          abbreviateAreaLabel={abbreviateAreaLabel}
        />
        <CategoryPieChart
          data={data.desviosPorCategoria}
          textPrimary={textPrimary}
          pieColors={pieColors}
          tooltipStyle={tooltipStyle}
        />
        <ScopePieChart
          data={data.desviosInternoExterno || []}
          textPrimary={textPrimary}
          pieColors={pieColors}
          tooltipStyle={tooltipStyle}
        />
        <IsoNormaPieChart
          data={data.distribucionPorNormaIso || []}
          textPrimary={textPrimary}
          pieColors={pieColors}
          tooltipStyle={tooltipStyle}
        />
        <CategoryBarChart
          data={data.desviosPorCategoriaCompleta}
          textPrimary={textPrimary}
          textMuted={textMuted}
          tooltipStyle={tooltipStyle}
        />
        <IsoChart
          data={data.desviosPorIso}
          textPrimary={textPrimary}
          textMuted={textMuted}
          palette={palette}
          tooltipStyle={tooltipStyle}
          IsoYAxisTick={IsoYAxisTick}
          totalRecords={data.totalRecords}
        />
      </Grid>
    </Box>
  );
}
