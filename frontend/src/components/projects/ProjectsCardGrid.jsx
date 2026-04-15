import ProjectCard from './ProjectCard';

/**
 * ProjectsCardGrid — list view for project wide horizontal cards.
 * @param {Object} props
 * @param {Array} props.projects - Array of project objects
 * @param {Set} props.selectedIds - Set of selected project IDs
 * @param {Function} props.onSelectProject - Toggle selection for one project
 * @param {Function} props.onDeleteProject - Open project delete dialog
 * @param {Function} props.onOpenStatusModal - Open project status modal
 */
export default function ProjectsCardGrid({
    projects,
    selectedIds,
    onSelectProject,
    onDeleteProject,
    onOpenStatusModal,
}) {
    return (
        <div className="expert-wide-card-list">
            <style>{`
                .expert-wide-card-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }
            `}</style>
            {projects.map((project) => (
                <ProjectCard
                    key={project.project_id}
                    project={project}
                    selected={selectedIds.has(project.project_id)}
                    onSelect={() => onSelectProject(project.project_id)}
                    onDelete={onDeleteProject}
                    onOpenStatusModal={onOpenStatusModal}
                />
            ))}
        </div>
    );
}
