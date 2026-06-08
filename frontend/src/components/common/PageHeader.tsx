import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';

interface Breadcrumb { label: string; href?: string }

interface Props {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, breadcrumbs, actions }: Props) => (
  <Box sx={{ mb: 3 }}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 1 }}>
        {breadcrumbs.map((b, i) =>
          b.href ? (
            <Link key={i} href={b.href} underline="hover" color="text.secondary" variant="caption">
              {b.label}
            </Link>
          ) : (
            <Typography key={i} variant="caption" color="text.primary">{b.label}</Typography>
          )
        )}
      </Breadcrumbs>
    )}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="h4" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{actions}</Box>}
    </Box>
  </Box>
);
