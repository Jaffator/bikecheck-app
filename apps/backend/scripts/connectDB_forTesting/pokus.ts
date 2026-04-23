import { connectToDB } from './connectDB';

async function getActions_byGroup() {
  const prisma = connectToDB();
  const groupid = 13;
  const bikeid = 141;
  function createResponseObject(group, actions) {}

  const group = await prisma.component_groups.findUnique({
    where: { id: groupid },
  });

  const actions = await prisma.events_action.findMany({
    where: {
      event_action_targets: {
        some: {
          component_types: {
            component_group_id: groupid,
          },
        },
      },
    },
    select: {
      id: true,
      action_name: true,
      replace_action: true,
      event_action_tags: {
        select: {
          event_action_tag: true,
        },
      },
      event_action_targets: {
        select: {
          component_types: {
            select: {
              component_type: true,
              components_mounted: {
                where: {
                  bike_id: bikeid,
                  is_active: true,
                },
                select: {
                  id: true,
                  component_desc: true,
                  position: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const mappedAction = actions.map((action) => ({
    id: action.id,
    action_name: action.action_name,
    replace_action: action.replace_action,
    tags: action.event_action_tags.map((tag) => tag.event_action_tag),
    components: action.event_action_targets.flatMap((target) =>
      target.component_types.components_mounted.map((mounted) => ({
        id: mounted.id,
        component_desc: mounted.component_desc,
        position: mounted.position,
        component_type: target.component_types.component_type,
      })),
    ),
  }));
  const actionsOnGroupComponents = {
    group_id: group?.id,
    group_name: group?.group_name,
    side_choice: group?.side_choice,
    actions: mappedAction,
  };
  console.log(actionsOnGroupComponents);
  //   console.log(group);
  //   console.log(mappedAction);
}

getActions_byGroup();
