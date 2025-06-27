import { getProducerDashboardStats, ProducerStats } from '@/server-actions/users/userQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, BarChart, Music, Heart } from 'lucide-react';

interface ProducerStatsGridProps {
    producerId: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
};

export async function ProducerStatsGrid({ producerId }: ProducerStatsGridProps) {
    const stats: ProducerStats = await getProducerDashboardStats(producerId);

    const statCards = [
        {
            title: 'Total Revenue',
            value: formatCurrency(stats.totalRevenue),
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
            description: 'All-time earnings',
        },
        {
            title: 'Total Sales',
            value: formatNumber(stats.totalSales),
            icon: <BarChart className="h-4 w-4 text-muted-foreground" />,
            description: 'All-time completed sales',
        },
        {
            title: 'Total Plays',
            value: formatNumber(stats.totalPlays),
            icon: <Music className="h-4 w-4 text-muted-foreground" />,
            description: 'Across all your tracks',
        },
        {
            title: 'Total Tracks',
            value: formatNumber(stats.totalTracks),
            icon: <Heart className="h-4 w-4 text-muted-foreground" />,
            description: 'Published on the platform',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {statCards.map((card) => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        {card.icon}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground">{card.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
} 