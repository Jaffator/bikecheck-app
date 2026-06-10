CREATE UNIQUE INDEX "event_action_tags_event_action_id_event_action_tag_key" ON "event_action_tags"("event_action_id", "event_action_tag");
CREATE UNIQUE INDEX "event_action_targets_event_action_id_component_type_id_key" ON "event_action_targets"("event_action_id", "component_type_id");
