import ClientCard from './ClientCard';

export default function ClientsCardGrid({
    clients,
    selectedIds,
    onSelectClient,
    onViewClient,
    onDeleteClient,
    onOpenRules,
    onEditClient,
}) {
    return (
        <div className="card-grid">
            {clients.map((client) => (
                <ClientCard
                    key={client.client_id}
                    client={client}
                    projectCount={client.project_count ?? 0}
                    userCount={client.user_count ?? 0}
                    selected={selectedIds.has(client.client_id)}
                    onSelect={() => onSelectClient(client.client_id)}
                    onView={() => onViewClient(client.client_id)}
                    onDelete={() => onDeleteClient(client.client_id)}
                    onOpenRules={() => onOpenRules && onOpenRules(client.service_rules)}
                    onEdit={() => onEditClient && onEditClient(client.client_id)}
                />
            ))}
        </div>
    );
}
